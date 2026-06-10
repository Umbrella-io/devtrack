import type { NextRequest } from "next/server";

const STATE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const WEBHOOK_PREFIXES = [
  "/api/webhooks/github",
  "/api/webhooks/custom",
  "/api/webhooks/dispatch",
];

const RATE_LIMIT_API_PREFIXES = [
  "/api/metrics",
  "/api/auth/signin",
  "/api/auth/callback",
];

function getAllowedOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGINS ?? "";
  const nextauthUrl = process.env.NEXTAUTH_URL;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const origins: string[] = [];
  for (const s of raw.split(",")) {
    const t = s.trim();
    if (t) origins.push(t.replace(/\/+$/, ""));
  }
  if (nextauthUrl) origins.push(nextauthUrl.replace(/\/+$/, ""));
  if (appUrl) origins.push(appUrl.replace(/\/+$/, ""));
  const devOrigin = process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : null;
  if (devOrigin && !origins.some((o) => o === devOrigin)) {
    origins.push(devOrigin);
  }
  return origins;
}

function isWebhookRoute(pathname: string): boolean {
  return WEBHOOK_PREFIXES.some((p) => pathname.startsWith(p));
}

function isRateLimitRoute(pathname: string): boolean {
  return RATE_LIMIT_API_PREFIXES.some((p) => pathname.startsWith(p));
}

/**
 * Checks whether an HTTP method is state-changing (POST, PUT, PATCH, DELETE).
 * @param method - The HTTP method string (e.g. "GET", "POST").
 * @returns True if the method changes state, false otherwise.
 */
export function isStateChangingMethod(method: string): boolean {
  return STATE_METHODS.has(method);
}

/**
 * Determines whether a route pathname is exempt from CSRF protection (e.g. webhooks or rate-limited APIs).
 * @param pathname - The URL pathname.
 * @returns True if the path is exempt, false otherwise.
 */
export function isCsrfExempt(pathname: string): boolean {
  return isWebhookRoute(pathname) || isRateLimitRoute(pathname);
}

/**
 * Validates the request Origin or Referer header against allowed origins to protect against CSRF.
 * If neither header is present, the request is considered valid.
 * @param req - The incoming Next.js request.
 * @returns An object indicating whether the request is valid and a reason if not.
 */
export function validateCsrf(req: NextRequest): {
  valid: boolean;
  reason?: string;
} {
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");

  if (!origin && !referer) {
    return { valid: true };
  }

  const allowed = getAllowedOrigins();
  if (allowed.length === 0) {
    return { valid: true };
  }

  if (origin) {
    const match = allowed.some((a) => origin === a || origin.startsWith(a + "/"));
    if (!match) {
      return { valid: false, reason: "Forbidden" };
    }
    return { valid: true };
  }

  if (referer) {
    const match = allowed.some((a) => referer.startsWith(a));
    if (!match) {
      return { valid: false, reason: "Forbidden" };
    }
  }

  return { valid: true };
}
