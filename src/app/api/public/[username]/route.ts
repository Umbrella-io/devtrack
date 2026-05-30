import { NextRequest, NextResponse } from "next/server";
import { fetchPublicProfile } from "@/lib/public-profile-data";
import { getUpstashConfig, upstashRateLimitFixedWindow } from "@/lib/upstash-rest";

export const dynamic = "force-dynamic";

/**
 * In-memory rate limiter for IP addresses.
 * Maps IP -> { count: number, resetAt: number }
 * This resets on server restart. For production, use Redis.
 */
const ipRateLimits = new Map<
  string,
  { count: number; resetAt: number }
>();

const RATE_LIMIT_REQUESTS = 30;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

function cleanOldEntries(map: Map<string, { count: number; resetAt: number }>) {
  const now = Date.now();
  for (const [key, val] of map.entries()) {
    if (val.resetAt <= now) map.delete(key);
  }
}

function getRateLimitKey(req: NextRequest): string {
  // req.ip is populated by the Next.js / Vercel runtime from the verified
  // network-layer source address and cannot be spoofed by the caller.
  //
  // x-forwarded-for is intentionally excluded here: it is a plain request
  // header that any client can set to an arbitrary value. Trusting it as the
  // primary key allows an attacker to rotate the header on every request,
  // bypass the per-IP limit entirely, and exhaust the shared GITHUB_TOKEN
  // quota (5 000 req/hr), making the endpoint unavailable for all users.
  return req.ip || req.headers.get("x-real-ip") || "unknown";
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  for (const [key, record] of ipRateLimits) {
    if (now > record.resetAt) ipRateLimits.delete(key);
  }
  const record = ipRateLimits.get(ip);

  if (!record || now > record.resetAt) {
    // New window or expired
    ipRateLimits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  if (record.count < RATE_LIMIT_REQUESTS) {
    record.count++;
    return { allowed: true };
  }

  // Rate limit exceeded
  const retryAfter = Math.ceil((record.resetAt - now) / 1000);
  return { allowed: false, retryAfter };
}

export async function GET(
  req: NextRequest,
  { params }: { params: { username: string } }
): Promise<NextResponse> {
  cleanOldEntries(ipRateLimits);
  const { username } = params;
  // Rate limiting
  const ip = getRateLimitKey(req);
  const rateLimit = getUpstashConfig()
    ? await upstashRateLimitFixedWindow({
        key: `public-profile-rate-limit:${ip}`,
        limit: RATE_LIMIT_REQUESTS,
        windowSeconds: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
      })
    : checkRateLimit(ip);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfter),
        },
      }
    );
  }

  const profile = await fetchPublicProfile(username);

  if (!profile) {
    return NextResponse.json(
      { error: "User not found or profile is not public" },
      { status: 404 }
    );
  }

  return NextResponse.json(profile);
}
