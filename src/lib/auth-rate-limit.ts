/**
 * Authentication rate limiter.
 *
 * Applies a strict per-IP fixed-window limit to authentication-sensitive
 * endpoints (OAuth callback/code exchange routes) to prevent brute-force
 * and credential-stuffing attacks without penalizing cancelled OAuth starts.
 *
 * Uses the shared createMemoryFixedWindowRateLimiter factory so behaviour
 * is consistent with the rest of the project's rate-limiting infrastructure.
 * The auth namespace ("auth:<ip>") is intentionally separate from the metrics
 * and contact namespaces so the counters never interfere with each other.
 *
 * Protected paths (see AUTH_SENSITIVE_PREFIXES):
 *   GET /api/auth/callback/*            — OAuth callback / code exchange
 *   GET /api/auth/link-github/callback  — Secondary account link callback
 *
 * Deliberately NOT rate-limited by this module:
 *   GET/POST /api/auth/signin/* — OAuth initiation, safe to retry after cancel
 *   GET /api/auth/session        — called on every page render
 *   GET /api/auth/csrf           — CSRF token fetch, not an attack surface
 *   GET /api/auth/signout        — termination, not initiation
 */

import {
  createMemoryFixedWindowRateLimiter,
  type MemoryRateLimitResult,
} from "@/lib/rate-limit";

// 15-minute rolling window as specified in issue #1303.
export const AUTH_WINDOW_MS = 15 * 60 * 1000;

// Maximum requests per IP per window in production.
// A full GitHub OAuth sign-in consumes 2 requests (initiation + callback),
// so 5 allows two complete sign-in attempts plus one spare before throttling.
export const AUTH_LIMIT = 5;

/**
 * Path prefixes whose requests count toward the authentication rate limit.
 * Only OAuth callback/code-exchange routes are included. Initiation routes are
 * intentionally excluded so an interrupted GitHub redirect can be retried
 * without tripping the limiter before any code exchange has occurred.
 */
export const AUTH_SENSITIVE_PREFIXES = [
  "/api/auth/callback",
  "/api/auth/link-github/callback",
] as const;

const authLimiter = createMemoryFixedWindowRateLimiter({
  windowMs: AUTH_WINDOW_MS,
  // Prune stale entries once per window so memory does not grow unbounded.
  pruneIntervalMs: AUTH_WINDOW_MS,
  maxEntries: 5_000,
});

/**
 * Check whether the given IP has exceeded the authentication rate limit.
 *
 * @param ip     - The client IP address (typically from getClientIp()).
 * @param limit  - Override the production limit (used in tests / dev).
 */
export function checkAuthRateLimit(
  ip: string,
  limit: number = AUTH_LIMIT,
): MemoryRateLimitResult {
  return authLimiter.check(`auth:${ip}`, limit);
}

/**
 * Returns true when the pathname belongs to an authentication-sensitive route
 * that should be subject to auth rate limiting.
 */
export function isAuthSensitivePath(pathname: string): boolean {
  return AUTH_SENSITIVE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
