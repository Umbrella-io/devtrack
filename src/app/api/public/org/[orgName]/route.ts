// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getOrgAnalytics } from "@/lib/orgAnalytics";
import { getUpstashConfig, upstashRateLimitFixedWindow } from "@/lib/upstash-rest";
import { createMemoryFixedWindowRateLimiter, getClientIp } from "@/lib/rate-limit";
import { isMetricsCacheBypassed } from "@/lib/metrics-cache";

export const dynamic = "force-dynamic";

/**
 * GitHub org names: 1–39 chars, alphanumeric or hyphens,
 * cannot start or end with a hyphen, no consecutive hyphens.
 */
const GITHUB_ORG_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

/**
 * In-memory rate limiter for IP addresses.
 * Maps IP -> { count: number, resetAt: number }
 * This resets on server restart. For production, use Redis.
 */
const RATE_LIMIT_REQUESTS = 30;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MEMORY_MAX_ENTRIES = Number(process.env.MEMORY_RATE_LIMIT_MAX_ENTRIES ?? 10_000);
const memoryLimiter = createMemoryFixedWindowRateLimiter({
  windowMs: RATE_LIMIT_WINDOW_MS,
  pruneIntervalMs: 5 * 60 * 1000,
  maxEntries: Number.isFinite(MEMORY_MAX_ENTRIES) ? MEMORY_MAX_ENTRIES : 10_000,
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgName: string }> }
): Promise<NextResponse> {
  const { orgName } = await params;

  // Validate org name before touching any downstream service.
  if (!GITHUB_ORG_RE.test(orgName)) {
    return NextResponse.json(
      { error: "Invalid organization name" },
      { status: 400 }
    );
  }

  // Rate limiting
  const ip = getClientIp(req);
  const rateLimit = getUpstashConfig()
    ? await upstashRateLimitFixedWindow({
        key: `public-org-rate-limit:${ip}`,
        limit: RATE_LIMIT_REQUESTS,
        windowSeconds: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
      })
    : (() => {
        const local = memoryLimiter.check(
          `public-org-rate-limit:${ip}`,
          RATE_LIMIT_REQUESTS
        );
        return local.allowed
          ? { allowed: true }
          : {
              allowed: false,
              retryAfter: Math.max(
                local.reset - Math.floor(Date.now() / 1000),
                1
              ),
            };
      })();

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

  // Parse query params
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const perPage = Math.min(
    30,
    Math.max(1, parseInt(searchParams.get("perPage") ?? "10", 10) || 10)
  );

  const bypass = isMetricsCacheBypassed(req);

  const payload = await getOrgAnalytics(orgName, page, perPage, bypass);

  if (payload === null) {
    return NextResponse.json(
      { error: "Organization analytics unavailable" },
      { status: 503 }
    );
  }

  // Empty org (no members) is still a valid 200 response
  return NextResponse.json(payload, {
    status: 200,
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
