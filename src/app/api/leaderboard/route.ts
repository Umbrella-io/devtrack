import { NextRequest, NextResponse } from "next/server";
import { cacheGet, isMetricsCacheBypassed } from "@/lib/metrics-cache";
import { pruneExpiredRateLimits, type RateLimitEntry } from "@/lib/leaderboard-cache";
import {
  getUpstashConfig,
  upstashRateLimitFixedWindow,
  upstashTryAcquireLock,
} from "@/lib/upstash-rest";
import {
  buildLeaderboard,
  getMemoryCachedLeaderboard,
  setMemoryCachedLeaderboard,
  isFresh,
  LEADERBOARD_CACHE_KEY,
  LEADERBOARD_BUILD_LOCK_KEY,
  CACHE_STALE_SECONDS,
  type LeaderboardPayload,
} from "@/lib/leaderboard";
import { cacheSet } from "@/lib/metrics-cache";

export const dynamic = "force-dynamic";

const RATE_LIMIT_REQUESTS = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const memoryRateLimits = new Map<string, RateLimitEntry>();

function getRateLimitKey(req: NextRequest): string {
  return req.ip ?? req.headers.get("x-real-ip") ?? "unknown";
}

function checkMemoryRateLimit(
  ip: string
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  pruneExpiredRateLimits(memoryRateLimits, now);
  const record = memoryRateLimits.get(ip);

  if (!record || now > record.resetAt) {
    memoryRateLimits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  if (record.count < RATE_LIMIT_REQUESTS) {
    record.count += 1;
    return { allowed: true };
  }

  return {
    allowed: false,
    retryAfter: Math.ceil((record.resetAt - now) / 1000),
  };
}

async function checkRateLimit(
  ip: string
): Promise<{ allowed: boolean; retryAfter?: number }> {
  if (getUpstashConfig()) {
    return upstashRateLimitFixedWindow({
      key: `leaderboard-rate-limit:${ip}`,
      limit: RATE_LIMIT_REQUESTS,
      windowSeconds: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
    });
  }
  return checkMemoryRateLimit(ip);
}

export async function GET(req: NextRequest) {
  const ip = getRateLimitKey(req);
  const rateLimit = await checkRateLimit(ip);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfter) },
      }
    );
  }

  const bypass = isMetricsCacheBypassed(req);

  if (!bypass) {
    const mem = getMemoryCachedLeaderboard();
    if (mem) {
      return NextResponse.json(mem, {
        headers: { "x-devtrack-leaderboard-cache": "memory" },
      });
    }

    const cached = await cacheGet<LeaderboardPayload>(LEADERBOARD_CACHE_KEY);
    if (cached && isFresh(cached)) {
      setMemoryCachedLeaderboard(cached);
      return NextResponse.json(cached);
    }

    // Avoid thundering herd on cache misses across serverless instances.
    if (getUpstashConfig()) {
      const locked = await upstashTryAcquireLock({
        key: LEADERBOARD_BUILD_LOCK_KEY,
        ttlSeconds: 5 * 60,
      });

      if (!locked) {
        if (cached) {
          return NextResponse.json(cached, {
            headers: { "x-devtrack-leaderboard-cache": "stale" },
          });
        }
        return NextResponse.json(
          { error: "Leaderboard is rebuilding. Please retry shortly." },
          { status: 503, headers: { "Retry-After": "5" } }
        );
      }
    }
  }

  try {
    const payload = await buildLeaderboard();
    await cacheSet(LEADERBOARD_CACHE_KEY, payload, CACHE_STALE_SECONDS);
    setMemoryCachedLeaderboard(payload);
    return NextResponse.json(payload);
  } catch {
    const cached = await cacheGet<LeaderboardPayload>(LEADERBOARD_CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { "x-devtrack-leaderboard-cache": "error-stale" },
      });
    }
    return NextResponse.json(
      { error: "Failed to build leaderboard" },
      { status: 500 }
    );
  }
}
