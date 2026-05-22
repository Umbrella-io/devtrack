import { NextRequest } from "next/server";

const WINDOW_MS = 60 * 1000;
const BADGE_LIMIT = 20;

const buckets = new Map<string, number[]>();

export type BadgeRateLimitResult = {
  allowed: boolean;
  remaining: number;
  reset: number;
};

function pruneBuckets(now: number) {
  if (buckets.size < 500) return;
  const cutoff = now - WINDOW_MS;
  for (const [key, timestamps] of Array.from(buckets.entries())) {
    if (timestamps.every((t) => t <= cutoff)) buckets.delete(key);
  }
}

export function checkBadgeRateLimit(ip: string): BadgeRateLimitResult {
  const now = Date.now();
  pruneBuckets(now);

  const key = `badge:${ip}`;
  const cutoff = now - WINDOW_MS;
  const active = (buckets.get(key) ?? []).filter((t) => t > cutoff);
  const reset = Math.ceil(((active[0] ?? now) + WINDOW_MS) / 1000);

  if (active.length >= BADGE_LIMIT) {
    buckets.set(key, active);
    return { allowed: false, remaining: 0, reset };
  }

  active.push(now);
  buckets.set(key, active);
  return { allowed: true, remaining: BADGE_LIMIT - active.length, reset };
}

export function getBadgeClientIp(req: NextRequest): string {
  return (
    req.ip ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}
