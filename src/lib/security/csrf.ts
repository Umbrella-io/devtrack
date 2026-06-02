/**
 * CSRF protection utilities — Origin/Referer-based validation for
 * state-changing requests authenticated via NextAuth session cookies.
 *
 * Design rationale
 * ----------------
 * NextAuth sets SameSite=Lax cookies by default, which blocks cross-site
 * form-submission attacks but does not cover same-registered-domain
 * subdomain attacks or certain browser edge cases. Origin validation adds
 * an explicit server-side check that is independent of cookie attributes.
 *
 * Exemptions
 * ----------
 * Routes that authenticate via their own out-of-band mechanism (HMAC
 * signatures, bearer secrets) are not subject to this check:
 *
 *   /api/webhooks/github    — x-hub-signature-256 HMAC verification
 *   /api/webhooks/dispatch  — WEBHOOK_DISPATCH_SECRET bearer token
 *   /api/cron/              — CRON_SECRET bearer token
 *   /api/auth/              — NextAuth internals (callbacks, sign-out)
 *
 * Requests that carry an Authorization: Bearer header are also exempted
 * because they are API clients (e.g. the local-coding CLI) rather than
 * browser sessions and are not susceptible to CSRF.
 */

export const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const CSRF_EXEMPT_PREFIXES = [
  "/api/webhooks/github",
  "/api/webhooks/dispatch",
  "/api/cron/",
  "/api/auth/",
] as const;

/**
 * Returns true for paths that authenticate via their own mechanism and
 * must not be gated by Origin validation.
 */
export function isCsrfExemptPath(pathname: string): boolean {
  return CSRF_EXEMPT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix)
  );
}

function extractOrigin(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/**
 * Builds the set of origins that are permitted to make authenticated
 * state-changing requests.
 *
 * Sources (both are merged):
 *   NEXTAUTH_URL      — the canonical application origin; required by NextAuth
 *   ALLOWED_ORIGINS   — comma-separated list of additional allowed origins
 *                       (useful for staging / preview deployments)
 *
 * If neither variable is set the returned set is empty, which causes the
 * CSRF check in middleware to skip enforcement and log a warning instead.
 */
export function buildAllowedOrigins(): Set<string> {
  const origins = new Set<string>();

  const nextAuthUrl = process.env.NEXTAUTH_URL;
  if (nextAuthUrl) {
    const o = extractOrigin(nextAuthUrl);
    if (o) origins.add(o);
  }

  const extra = process.env.ALLOWED_ORIGINS;
  if (extra) {
    for (const raw of extra.split(",")) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      const o = extractOrigin(trimmed);
      if (o) origins.add(o);
    }
  }

  return origins;
}

/**
 * Extracts the request origin from the Origin header, falling back to the
 * Referer header when Origin is absent (some browsers omit it for same-site
 * navigations).
 *
 * Returns null when neither header is present.
 */
export function getRequestOrigin(
  headers: { get(name: string): string | null }
): string | null {
  const origin = headers.get("origin");
  if (origin) return origin.trim();

  const referer = headers.get("referer");
  if (referer) return extractOrigin(referer);

  return null;
}

/**
 * Returns true if the supplied requestOrigin is in the allowed set.
 * The comparison is exact and case-sensitive (origins are always lowercase
 * per RFC 6454 when produced by a conforming browser).
 */
export function isOriginAllowed(
  requestOrigin: string,
  allowedOrigins: Set<string>
): boolean {
  return allowedOrigins.has(requestOrigin);
}
