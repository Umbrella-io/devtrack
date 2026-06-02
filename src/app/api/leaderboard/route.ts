// @ts-nocheck
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
import { supabaseAdmin, isSupabaseAdminAvailable } from "@/lib/supabase";
import { cacheSet } from "@/lib/metrics-cache";

export const revalidate = 3600;

const RATE_LIMIT_REQUESTS = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const memoryRateLimits = new Map<string, RateLimitEntry>();

// In-process build promise to dedupe concurrent builds in the same Node
// process when an external cache/lock (Upstash) is not configured.
let _inProcessLeaderboardBuild: Promise<import("@/lib/leaderboard").LeaderboardPayload | null> | null = null;
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

    // If Supabase is available, check the persistent leaderboard cache there
    if (isSupabaseAdminAvailable) {
      try {
        const { data: row } = await supabaseAdmin
          .from("leaderboard_cache")
          .select("payload, generated_at, expires_at, building_until")
          .eq("key", LEADERBOARD_CACHE_KEY)
          .maybeSingle();

        if (row && row.payload) {
          const payload = row.payload as LeaderboardPayload;
          if (isFresh(payload)) {
            setMemoryCachedLeaderboard(payload);
            return NextResponse.json(payload, {
              headers: { "x-devtrack-leaderboard-cache": "supabase" },
            });
          }

          // Stale payload exists; attempt to acquire DB lock to rebuild.
          const nowISO = new Date().toISOString();
          const lockUntilISO = new Date(Date.now() + 5 * 60 * 1000).toISOString();
          const { data: updated } = await supabaseAdmin
            .from("leaderboard_cache")
            .update({ building_until: lockUntilISO })
            .eq("key", LEADERBOARD_CACHE_KEY)
            .or(`building_until.lte.${nowISO},building_until.is.null`)
            .select();

          if (updated && (updated as any[]).length > 0) {
            // We won the lock — rebuild in background and return stale payload now.
            buildAndCache().catch(() => {});
            return NextResponse.json(payload, {
              headers: { "x-devtrack-leaderboard-cache": "stale-supabase" },
            });
          }

          // Another instance is rebuilding — return stale payload.
          return NextResponse.json(payload, {
            headers: { "x-devtrack-leaderboard-cache": "stale" },
          });
        }

        // No persistent cache row exists — do NOT build synchronously in-request.
        // A scheduled rebuild should populate the `leaderboard_cache` row.
        // Return 503 so clients/backends know to retry later.
        return NextResponse.json(
          { error: 'Leaderboard cache not yet populated. Trigger scheduled rebuild.' },
          { status: 503, headers: { 'Retry-After': '30' } }
        );
      } catch (err) {
        // Ignore Supabase cache errors — fall back to in-process behavior
        console.warn("[Leaderboard] Supabase cache error:", err);
      }
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
    // Deduplicate builds within this process to avoid repeated expensive
    // work when an external shared lock (Upstash) isn't available.
    async function buildAndCache() {
      if (_inProcessLeaderboardBuild) return _inProcessLeaderboardBuild;

      _inProcessLeaderboardBuild = (async () => {
        try {
          const payload = await buildLeaderboard();
          await cacheSet(LEADERBOARD_CACHE_KEY, payload, CACHE_STALE_SECONDS);
          setMemoryCachedLeaderboard(payload);
          // Persist to Supabase table so other instances can read the payload
          if (isSupabaseAdminAvailable) {
            try {
              const now = new Date().toISOString();
              const expiresAt = new Date(Date.now() + CACHE_STALE_SECONDS * 1000).toISOString();
              await supabaseAdmin
                .from("leaderboard_cache")
                .upsert(
                  {
                    key: LEADERBOARD_CACHE_KEY,
                    payload,
                    generated_at: now,
                    expires_at: expiresAt,
                    building_until: null,
                    updated_at: now,
                  },
                  { onConflict: "key" }
                );
            } catch (err) {
              console.warn("[Leaderboard] Failed to persist cache to Supabase:", err);
            }
          }

          return payload;
        } finally {
          // clear the promise after completion so future requests may trigger
          // a new build when cache expires
          _inProcessLeaderboardBuild = null;
        }
      })();

      return _inProcessLeaderboardBuild;
    }

    const payload = await buildAndCache();
    if (payload) return NextResponse.json(payload);
    // Fall through to error handling below if payload is null
  } catch (e) {
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
