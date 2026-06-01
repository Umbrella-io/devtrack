import { NextRequest } from "next/server";

const WINDOW_MS = 60 * 1000;
const BADGE_LIMIT = 20;

type RateLimitBucket = {
  windowStart: number;
  count: number;
};

type Bucket = {
  windowStart: number;
  count: number;
};

const buckets = new Map<string, Bucket>();

export type BadgeRateLimitResult = {
  allowed: boolean;
  remaining: number;
  reset: number;
};

function pruneBuckets(now: number) {
  if (buckets.size < 500) return;

  const cutoff = now - WINDOW_MS;

  for (const [key, bucket] of buckets.entries()) {
    if (bucket.windowStart <= cutoff) {
      buckets.delete(key);
    }
  }
}

export function checkBadgeRateLimit(ip: string): BadgeRateLimitResult {
  const now = Date.now();

  pruneBuckets(now);

  const key = `badge:${ip}`;

  let bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    bucket = {
      windowStart: now,
      count: 0,
    };
  }

  const reset = Math.ceil(
    (bucket.windowStart + WINDOW_MS) / 1000
  );

  if (bucket.count >= BADGE_LIMIT) {
    buckets.set(key, bucket);

    return {
      allowed: false,
      remaining: 0,
      reset,
    };
  }

  bucket.count++;

  buckets.set(key, bucket);

  return {
    allowed: true,
    remaining: BADGE_LIMIT - bucket.count,
    reset,
  };
}

export function getBadgeClientIp(req: NextRequest): string {
  return (
    req.ip ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}