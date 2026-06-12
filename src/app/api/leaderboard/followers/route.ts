import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isMetricsCacheBypassed } from "@/lib/metrics-cache";
import {
  getFollowerLeaderboard,
  GitHubRateLimitError,
  type FollowerSortMetric,
} from "@/lib/follower-leaderboard";
import {
  pruneExpiredRateLimits,
  type RateLimitEntry,
} from "@/lib/leaderboard-cache";
import { getUpstashConfig, upstashRateLimitFixedWindow } from "@/lib/upstash-rest";

export const dynamic = "force-dynamic";

/** 10 requests per 30 s per authenticated user — protects GitHub quotas. */
const RATE_LIMIT_REQUESTS = 10;
const RATE_LIMIT_WINDOW_MS = 30 * 1000;

const memoryRateLimits = new Map<string, RateLimitEntry>();

function checkMemoryRateLimit(key: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  pruneExpiredRateLimits(memoryRateLimits, now);
  const record = memoryRateLimits.get(key);

  if (!record || now > record.resetAt) {
    memoryRateLimits.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  if (record.count < RATE_LIMIT_REQUESTS) {
    record.count += 1;
    return { allowed: true };
  }

  return { allowed: false, retryAfter: Math.ceil((record.resetAt - now) / 1000) };
}

async function checkRateLimit(
  userId: string
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const key = `follower-leaderboard-rate-limit:${userId}`;
  if (getUpstashConfig()) {
    return upstashRateLimitFixedWindow({
      key,
      limit: RATE_LIMIT_REQUESTS,
      windowSeconds: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
    });
  }
  return checkMemoryRateLimit(key);
}

function normalizeSort(value: string | null): FollowerSortMetric {
  if (value === "commits" || value === "prs") return value;
  return "streak";
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.githubLogin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const githubLogin = session.githubLogin;
  const rateLimit = await checkRateLimit(githubLogin);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please wait before requesting again." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter ?? 30) } }
    );
  }

  const metric = normalizeSort(req.nextUrl.searchParams.get("sort"));
  const bypass = isMetricsCacheBypassed(req);

  try {
    const payload = await getFollowerLeaderboard(githubLogin, metric, bypass);
    return NextResponse.json(payload, {
      headers: { "x-devtrack-follower-cache": bypass ? "bypass" : "hit" },
    });
  } catch (err) {
    if (err instanceof GitHubRateLimitError) {
      return NextResponse.json(
        {
          error: "GitHub rate limit reached. Follower stats will be available shortly.",
          retryAfter: err.retryAfterSeconds,
        },
        { status: 503, headers: { "Retry-After": String(err.retryAfterSeconds) } }
      );
    }

    console.error("[FollowerLeaderboard] Unhandled error:", err);
    return NextResponse.json(
      { error: "Failed to load follower leaderboard." },
      { status: 500 }
    );
  }
}
