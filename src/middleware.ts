import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const isDev = process.env.NODE_ENV === "development";
const WINDOW_SECONDS = 60;
const AUTHENTICATED_LIMIT = isDev ? 5000 : 60;
const ANONYMOUS_LIMIT = isDev ? 1000 : 10;

const memoryBuckets = new Map<string, number[]>();

type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

function getIp(req: NextRequest) {
  return (
    req.ip ??
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
    headers.set("Retry-After", String(Math.max(result.reset - Math.floor(Date.now() / 1000), 1)));
  }
  return headers;
}

function checkMemoryLimit(key: string, limit: number, now: number): RateLimitResult {
  const cutoff = now - WINDOW_SECONDS * 1000;
  const active = (memoryBuckets.get(key) ?? []).filter(timestamp => timestamp > cutoff);
  const reset = Math.ceil(((active[0] ?? now) + WINDOW_SECONDS * 1000) / 1000);

  if (active.length >= limit) {
    memoryBuckets.set(key, active);
    return { allowed: false, limit, remaining: 0, reset };
  }
  active.push(now);
  memoryBuckets.set(key, active);
  return { allowed: true, limit, remaining: Math.max(limit - active.length, 0), reset };
}

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const githubId = typeof token?.githubId === "string" ? token.githubId : null;
  const identifier = githubId ? `user:${githubId}` : `ip:${getIp(req)}`;
  const limit = githubId ? AUTHENTICATED_LIMIT : ANONYMOUS_LIMIT;
  const result = checkMemoryLimit(identifier, limit, Date.now());
  const headers = buildHeaders(result);

  if (!result.allowed) {
    return NextResponse.json({ error: "Too many metrics requests. Please retry shortly." }, { status: 429, headers });
  }
  const response = NextResponse.next();
  headers.forEach((value, key) => response.headers.set(key, value));
  return response;
}

export const config = {
  matcher: "/api/metrics/:path*",
};
