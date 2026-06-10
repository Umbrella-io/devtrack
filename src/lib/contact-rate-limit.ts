import { NextRequest } from "next/server";

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const CONTACT_LIMIT = 3;

// NOTE: In-memory store for rate limiting contact form submissions.
// Extends edge/serverless rate limiting with specific IP-based hour windows.
export const contactBuckets = new Map<string, number[]>();

export type ContactRateLimitResult = {
  allowed: boolean;
  remaining: number;
  reset: number;
};

function pruneBuckets(now: number) {
  if (contactBuckets.size < 500) return;
  const cutoff = now - WINDOW_MS;
  for (const [key, timestamps] of Array.from(contactBuckets.entries())) {
    if (timestamps.every((t) => t <= cutoff)) {
      contactBuckets.delete(key);
    }
  }
}

/**
 * Evaluates the rate limit for contact form submissions from a specific IP using a sliding log algorithm.
 * @param ip - The client's IP address.
 * @returns A result object detailing if the submission is allowed, remaining requests, and reset epoch timestamp in seconds.
 */
export function checkContactRateLimit(ip: string): ContactRateLimitResult {
  const now = Date.now();
  pruneBuckets(now);

  const key = `contact:${ip}`;
  const cutoff = now - WINDOW_MS;
  const active = (contactBuckets.get(key) ?? []).filter((t) => t > cutoff);
  const reset = Math.ceil(((active[0] ?? now) + WINDOW_MS) / 1000);

  if (active.length >= CONTACT_LIMIT) {
    contactBuckets.set(key, active);
    return { allowed: false, remaining: 0, reset };
  }

  active.push(now);
  contactBuckets.set(key, active);
  return { allowed: true, remaining: CONTACT_LIMIT - active.length, reset };
}

/**
 * Extracts the client's IP address from request information for the contact endpoint.
 * Checks connection IP, x-forwarded-for, and x-real-ip headers.
 * @param req - The incoming Next.js request.
 * @returns The client IP address, or "unknown".
 */
export function getContactClientIp(req: NextRequest): string {
  return (
    (req as any).ip ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}
