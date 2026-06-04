import { NextRequest } from "next/server";
import { createMemoryFixedWindowRateLimiter, getClientIp } from "@/lib/rate-limit";

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
// Sliding window counter entry — O(1) per client instead of O(N) timestamps.
type Entry = {
  prevCount: number;   // requests counted in the previous window
  currCount: number;   // requests counted in the current window
  windowStart: number; // epoch ms, quantized to WINDOW_MS boundaries
};

const store = new Map<string, Entry>();

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
function pruneStore(now: number): void {
  if (store.size < 500) return;
  // Entries whose window has fully elapsed contribute nothing and can be freed.
  const cutoff = now - WINDOW_MS;
  for (const [key, entry] of store) {
    if (entry.windowStart < cutoff) store.delete(key);
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
  pruneStore(now);

  const key = `badge:${ip}`;
  const windowStart = Math.floor(now / WINDOW_MS) * WINDOW_MS;
  // Reset time is when the current fixed window boundary ends.
  const reset = Math.ceil((windowStart + WINDOW_MS) / 1000);

  let entry = store.get(key);

  if (!entry || entry.windowStart < windowStart - WINDOW_MS) {
    // No history, or history is older than one full window — start fresh.
    entry = { prevCount: 0, currCount: 0, windowStart };
  } else if (entry.windowStart < windowStart) {
    // Crossed a window boundary — promote current counts to previous.
    entry = { prevCount: entry.currCount, currCount: 0, windowStart };
  }
  // else: same window — use entry as-is.

  // Weighted contribution from the previous window based on how far into the
  // current window we are.  At windowStart the previous window counts fully;
  // at the end of the window its weight approaches zero.
  const elapsed = now - windowStart;
  const prevWeight = 1 - elapsed / WINDOW_MS;
  const estimate = Math.floor(entry.prevCount * prevWeight) + entry.currCount;

  if (estimate >= BADGE_LIMIT) {
    store.set(key, entry);
    return { allowed: false, remaining: 0, reset };
  }

  entry = { ...entry, currCount: entry.currCount + 1 };
  store.set(key, entry);
  const remaining = Math.max(
    0,
    BADGE_LIMIT - Math.floor(entry.prevCount * prevWeight) - entry.currCount
  );
  return { allowed: true, remaining, reset };
}

export function getBadgeClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    (req as NextRequest & { ip?: string }).ip ??
    "unknown"
  );
}