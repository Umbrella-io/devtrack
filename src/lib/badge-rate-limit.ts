import { NextRequest } from "next/server";
import { createMemoryFixedWindowRateLimiter, getClientIp } from "@/lib/rate-limit";

const WINDOW_MS = 60 * 1000;
const BADGE_LIMIT = 20;

// NOTE: This rate limiter is separate from the API middleware rate limiting.
// It applies per-IP limiting specifically for badge generation endpoints.

const MEMORY_MAX_ENTRIES = Number(process.env.MEMORY_RATE_LIMIT_MAX_ENTRIES ?? 10_000);
const memoryLimiter = createMemoryFixedWindowRateLimiter({
  windowMs: WINDOW_MS,
  pruneIntervalMs: 5 * 60 * 1000,
  maxEntries: Number.isFinite(MEMORY_MAX_ENTRIES) ? MEMORY_MAX_ENTRIES : 10_000,
});

export type BadgeRateLimitResult = {
  allowed: boolean;
  remaining: number;
  reset: number;
};

export function checkBadgeRateLimit(ip: string): BadgeRateLimitResult {
  const now = Date.now();
  const key = `badge:${ip}`;
  const result = memoryLimiter.check(key, BADGE_LIMIT, now);
  return {
    allowed: result.allowed,
    remaining: result.remaining,
    reset: result.reset,
  };
}

export function getBadgeClientIp(req: NextRequest): string {
  return getClientIp(req);
}
