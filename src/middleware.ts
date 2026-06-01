import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const isDev = process.env.NODE_ENV === "development";
const WINDOW_SECONDS = 60;

/* ============================================================
   SECURITY NOTICE: DEVELOPMENT MODE RATE-LIMIT SCALING
   These high thresholds are configured STRICTLY for local mock
   testing pipelines to handle high concurrent local dashboard refreshes.
   NOTE: In Next.js, process.env.NODE_ENV is a compile-time constant.
   It is baked into the bundle at build time and cannot change at runtime.
   Therefore, in production builds, isDev is always false and the
   AUTHENTICATED_LIMIT/ANONYMOUS_LIMIT will always be 60/10 respectively.
   In development (next dev), NODE_ENV is 'development' so the higher
   limits apply during local testing only.
   ==========================================
   ============================================================ */
const AUTHENTICATED_LIMIT = isDev ? 5000 : 60;
const ANONYMOUS_LIMIT = isDev ? 1000 : 10;

type MemoryBucket = {
  count: number;
  resetAt: number;
};

const memoryBuckets = new Map<string, MemoryBucket>();
const MEMORY_BUCKET_CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastMemoryBucketCleanup = 0;

type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

function getIp(req: NextRequest) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function buildHeaders(result: RateLimitResult) {
  const headers = new Headers();
  headers.set("X-RateLimit-Limit", String(result.limit));
  headers.set("X-RateLimit-Remaining", String(result.remaining));
  headers.set("X-RateLimit-Reset", String(result.reset));

  if (!result.allowed) {
    headers.set(
      "Retry-After",
      String(Math.max(result.reset - Math.floor(Date.now() / 1000), 1))
    );
  }

  return headers;
}

function pruneMemoryBuckets(now: number) {
  if (now - lastMemoryBucketCleanup <= MEMORY_BUCKET_CLEANUP_INTERVAL) {
    return;
  }

  lastMemoryBucketCleanup = now;

  for (const [key, bucket] of memoryBuckets.entries()) {
    if (bucket.resetAt <= now) {
      memoryBuckets.delete(key);
    }
  }
}

function checkMemoryLimit(
  key: string,
  limit: number,
  now: number
): RateLimitResult {
  pruneMemoryBuckets(now);

  const existingBucket = memoryBuckets.get(key);
  const bucket =
    existingBucket && existingBucket.resetAt > now
      ? existingBucket
      : {
          count: 0,
          resetAt: now + WINDOW_SECONDS * 1000,
        };
  const reset = Math.ceil(bucket.resetAt / 1000);

  if (bucket.count >= limit) {
    memoryBuckets.set(key, bucket);
    return {
      allowed: false,
      limit,
      remaining: 0,
      reset,
    };
  }

  bucket.count += 1;
  memoryBuckets.set(key, bucket);

  return {
    allowed: true,
    limit,
    remaining: Math.max(limit - bucket.count, 0),
    reset,
  };
}

/**
 * ATOMIC LUA EVALUATION IN UPSTASH REDIS
 * Prunes expired elements, checks window capacity, and commits mutation atomically.
 */
async function checkUpstashLimit(
  key: string,
  limit: number,
  now: number
): Promise<RateLimitResult | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  const cutoff = now - WINDOW_SECONDS * 1000;
  const reset = Math.ceil((now + WINDOW_SECONDS * 1000) / 1000);
  const memberToken = `${now}:${Math.random().toString(36).slice(2)}`;

  // Lua script ensures thread-safe atomic execution inside Redis engine
  const luaScript = `
    local key = KEYS[1]
    local cutoff = tonumber(ARGV[1])
    local now = tonumber(ARGV[2])
    local limit = tonumber(ARGV[3])
    local windowSeconds = tonumber(ARGV[4])
    local member = ARGV[5]

    redis.call('ZREMRANGEBYSCORE', key, 0, cutoff)
    local currentCount = redis.call('ZCARD', key)

    if currentCount >= limit then
      return {0, currentCount}
    else
      redis.call('ZADD', key, now, member)
      redis.call('EXPIRE', key, windowSeconds)
      return {1, currentCount + 1}
    end
  `;

  try {
    const response = await fetch(`${url}/eval`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        script: luaScript,
        keys: [key],
        args: [
          String(cutoff),
          String(now),
          String(limit),
          String(WINDOW_SECONDS),
          memberToken,
        ],
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    // Upstash REST eval response format: { result: [allowed_flag, current_count] }
    const [allowedFlag, currentCount] = data.result as [number, number];
    const isAllowed = allowedFlag === 1;

    return {
      allowed: isAllowed,
      limit,
      remaining: Math.max(limit - currentCount, 0),
      reset,
    };
  } catch (error) {
    console.error(
      "Rate-limiter cloud pipeline failure, falling back to local memory storage:",
      error
    );
    return null;
  }
}

async function checkRateLimit(identifier: string, limit: number) {
  const now = Date.now();
  const key = `metrics-rate-limit:${identifier}`;
  return (
    (await checkUpstashLimit(key, limit, now)) ??
    checkMemoryLimit(key, limit, now)
  );
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // PLAYWRIGHT_SERVER_MODE is not forwarded into the webServer env by
  // playwright.config.mjs, so isPlaywrightServer is always false at runtime.
  // Instead, attempt token resolution with both cookie name variants so the
  // non-secure cookie set by Playwright tests is always found.
  let token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: false,
    cookieName: "next-auth.session-token",
  });

  if (!token) {
    token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: true,
      cookieName: "__Secure-next-auth.session-token",
    });
  }

  const protectedRoutes = ["/dashboard", "/settings"];
  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isProtectedRoute) {
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  const githubId = typeof token?.githubId === "string" ? token.githubId : null;
  const identifier = githubId ? `user:${githubId}` : `ip:${getIp(req)}`;

  const limit = githubId
    ? AUTHENTICATED_LIMIT
    : ANONYMOUS_LIMIT;

  const result = await checkRateLimit(identifier, limit);

  const headers = buildHeaders(result);

  if (!result.allowed) {
    const isContact = req.nextUrl.pathname.startsWith("/api/contact");
    console.warn(isContact ? "contact_rate_limit_hit" : "metrics_rate_limit_hit", {
      identifier,
      path: req.nextUrl.pathname,
      limit,
    });

    return NextResponse.json(
      {
        error: isContact
          ? "Too many submissions. Please retry shortly."
          : "Too many metrics requests. Please retry shortly.",
      },
      { status: 429, headers }
    );
  }

  const response = NextResponse.next();

  headers.forEach((value, key) =>
    response.headers.set(key, value)
  );

  // Cache GET metric responses in the browser for 5 minutes.
  // This eliminates redundant function invocations on every dashboard
  // tab-switch or soft navigation, directly cutting Vercel Active CPU usage.
  // Responses are private (user-specific) so CDN caching is disabled.
  if (req.method === "GET") {
    response.headers.set(
      "Cache-Control",
      "private, max-age=300, stale-while-revalidate=600"
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/settings",
    "/settings/:path*",
    "/api/metrics/:path*",
    "/api/contact",
  ],
};
