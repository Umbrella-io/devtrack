import { NextRequest, NextResponse } from "next/server";

const DEFAULT_LIMIT = 60;
const DEFAULT_WINDOW_SECONDS = 60;

type UpstashPipelineResult = Array<{
  result?: unknown;
  error?: string;
}>;

function getPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || req.headers.get("x-real-ip") || "anonymous";
}

async function sha256(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function rateLimitResponse(retryAfter: number, limit: number, remaining: number) {
  return NextResponse.json(
    {
      error: "Too many metric requests",
      retryAfter,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": String(Math.max(0, remaining)),
        "X-RateLimit-Reset": String(Math.floor(Date.now() / 1000) + retryAfter),
      },
    }
  );
}

async function checkUpstashRateLimit(req: NextRequest) {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    return null;
  }

  const limit = getPositiveInt(process.env.METRICS_RATE_LIMIT_MAX, DEFAULT_LIMIT);
  const windowSeconds = getPositiveInt(
    process.env.METRICS_RATE_LIMIT_WINDOW_SECONDS,
    DEFAULT_WINDOW_SECONDS
  );
  const identityHash = await sha256(`${getClientIp(req)}:${req.nextUrl.pathname}`);
  const key = `metrics-rate-limit:${identityHash}`;

  const response = await fetch(`${redisUrl}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${redisToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", key],
      ["EXPIRE", key, windowSeconds, "NX"],
      ["TTL", key],
    ]),
    cache: "no-store",
  });

  if (!response.ok) {
    console.warn("Metrics rate limiter failed", {
      status: response.status,
      path: req.nextUrl.pathname,
    });
    return null;
  }

  const data = (await response.json()) as UpstashPipelineResult;
  const requestCount = Number(data[0]?.result ?? 0);
  const ttl = Number(data[2]?.result ?? windowSeconds);
  const retryAfter = ttl > 0 ? ttl : windowSeconds;

  if (requestCount > limit) {
    return rateLimitResponse(retryAfter, limit, limit - requestCount);
  }

  const next = NextResponse.next();
  next.headers.set("X-RateLimit-Limit", String(limit));
  next.headers.set("X-RateLimit-Remaining", String(Math.max(0, limit - requestCount)));
  next.headers.set(
    "X-RateLimit-Reset",
    String(Math.floor(Date.now() / 1000) + retryAfter)
  );
  return next;
}

export async function middleware(req: NextRequest) {
  return (await checkUpstashRateLimit(req)) ?? NextResponse.next();
}

export const config = {
  matcher: "/api/metrics/:path*",
};
