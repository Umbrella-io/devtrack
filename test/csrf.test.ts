import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import {
  SAFE_METHODS,
  isCsrfExemptPath,
  buildAllowedOrigins,
  getRequestOrigin,
  isOriginAllowed,
} from "@/lib/security/csrf";

// ── helpers ──────────────────────────────────────────────────────────────────

function fakeHeaders(entries: Record<string, string>) {
  return {
    get(name: string): string | null {
      return entries[name.toLowerCase()] ?? null;
    },
  };
}

// ── SAFE_METHODS ──────────────────────────────────────────────────────────────

describe("SAFE_METHODS", () => {
  it("contains GET, HEAD, and OPTIONS", () => {
    expect(SAFE_METHODS.has("GET")).toBe(true);
    expect(SAFE_METHODS.has("HEAD")).toBe(true);
    expect(SAFE_METHODS.has("OPTIONS")).toBe(true);
  });

  it("does not contain state-changing methods", () => {
    expect(SAFE_METHODS.has("POST")).toBe(false);
    expect(SAFE_METHODS.has("PUT")).toBe(false);
    expect(SAFE_METHODS.has("PATCH")).toBe(false);
    expect(SAFE_METHODS.has("DELETE")).toBe(false);
  });
});

// ── isCsrfExemptPath ──────────────────────────────────────────────────────────

describe("isCsrfExemptPath", () => {
  // Webhook endpoints use their own authentication mechanisms
  it("exempts /api/webhooks/github (HMAC signature auth)", () => {
    expect(isCsrfExemptPath("/api/webhooks/github")).toBe(true);
  });

  it("exempts /api/webhooks/dispatch (bearer secret auth)", () => {
    expect(isCsrfExemptPath("/api/webhooks/dispatch")).toBe(true);
  });

  // Cron endpoints use CRON_SECRET bearer tokens
  it("exempts /api/cron/ prefix", () => {
    expect(isCsrfExemptPath("/api/cron/")).toBe(true);
    expect(isCsrfExemptPath("/api/cron/weekly-digest")).toBe(true);
    expect(isCsrfExemptPath("/api/cron/any-future-cron-job")).toBe(true);
  });

  // NextAuth internals must never be blocked
  it("exempts /api/auth/ prefix", () => {
    expect(isCsrfExemptPath("/api/auth/callback/github")).toBe(true);
    expect(isCsrfExemptPath("/api/auth/signout")).toBe(true);
    expect(isCsrfExemptPath("/api/auth/session")).toBe(true);
  });

  // Custom webhook management routes are browser-session-authenticated → not exempt
  it("does not exempt /api/webhooks/custom (session-authenticated)", () => {
    expect(isCsrfExemptPath("/api/webhooks/custom")).toBe(false);
    expect(isCsrfExemptPath("/api/webhooks/custom/abc123")).toBe(false);
  });

  // Standard application routes must be protected
  it("does not exempt regular session-authenticated routes", () => {
    expect(isCsrfExemptPath("/api/goals")).toBe(false);
    expect(isCsrfExemptPath("/api/goals/some-id")).toBe(false);
    expect(isCsrfExemptPath("/api/user/settings")).toBe(false);
    expect(isCsrfExemptPath("/api/streak/freeze")).toBe(false);
    expect(isCsrfExemptPath("/api/daily-note")).toBe(false);
    expect(isCsrfExemptPath("/api/notifications/some-id")).toBe(false);
    expect(isCsrfExemptPath("/api/rooms")).toBe(false);
    expect(isCsrfExemptPath("/api/local-coding/keys")).toBe(false);
  });
});

// ── buildAllowedOrigins ───────────────────────────────────────────────────────

describe("buildAllowedOrigins", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("includes the origin from NEXTAUTH_URL", () => {
    vi.stubEnv("NEXTAUTH_URL", "http://localhost:3000");
    vi.stubEnv("ALLOWED_ORIGINS", "");
    const origins = buildAllowedOrigins();
    expect(origins.has("http://localhost:3000")).toBe(true);
  });

  it("strips path components from NEXTAUTH_URL — only the origin is stored", () => {
    vi.stubEnv("NEXTAUTH_URL", "https://app.example.com/some/path?q=1");
    vi.stubEnv("ALLOWED_ORIGINS", "");
    const origins = buildAllowedOrigins();
    expect(origins.has("https://app.example.com")).toBe(true);
    expect(origins.has("https://app.example.com/some/path")).toBe(false);
  });

  it("includes all origins from ALLOWED_ORIGINS (comma-separated)", () => {
    vi.stubEnv("NEXTAUTH_URL", "");
    vi.stubEnv(
      "ALLOWED_ORIGINS",
      "https://staging.example.com,https://preview.example.com"
    );
    const origins = buildAllowedOrigins();
    expect(origins.has("https://staging.example.com")).toBe(true);
    expect(origins.has("https://preview.example.com")).toBe(true);
  });

  it("combines NEXTAUTH_URL and ALLOWED_ORIGINS without duplicates", () => {
    vi.stubEnv("NEXTAUTH_URL", "https://app.example.com");
    vi.stubEnv("ALLOWED_ORIGINS", "https://staging.example.com,https://app.example.com");
    const origins = buildAllowedOrigins();
    expect(origins.has("https://app.example.com")).toBe(true);
    expect(origins.has("https://staging.example.com")).toBe(true);
    expect(origins.size).toBe(2);
  });

  it("tolerates extra whitespace around entries in ALLOWED_ORIGINS", () => {
    vi.stubEnv("NEXTAUTH_URL", "");
    vi.stubEnv("ALLOWED_ORIGINS", "  https://a.example.com  , https://b.example.com ");
    const origins = buildAllowedOrigins();
    expect(origins.has("https://a.example.com")).toBe(true);
    expect(origins.has("https://b.example.com")).toBe(true);
  });

  it("returns an empty set when neither variable is set", () => {
    vi.stubEnv("NEXTAUTH_URL", "");
    vi.stubEnv("ALLOWED_ORIGINS", "");
    expect(buildAllowedOrigins().size).toBe(0);
  });

  it("ignores empty entries in ALLOWED_ORIGINS", () => {
    vi.stubEnv("NEXTAUTH_URL", "");
    vi.stubEnv("ALLOWED_ORIGINS", ",,,https://valid.example.com,,,");
    const origins = buildAllowedOrigins();
    expect(origins.has("https://valid.example.com")).toBe(true);
    expect(origins.size).toBe(1);
  });
});

// ── getRequestOrigin ──────────────────────────────────────────────────────────

describe("getRequestOrigin", () => {
  it("returns the Origin header value when present", () => {
    const h = fakeHeaders({ origin: "https://app.example.com" });
    expect(getRequestOrigin(h)).toBe("https://app.example.com");
  });

  it("extracts the origin from the Referer header when Origin is absent", () => {
    const h = fakeHeaders({ referer: "https://app.example.com/dashboard" });
    expect(getRequestOrigin(h)).toBe("https://app.example.com");
  });

  it("returns null when neither Origin nor Referer is present", () => {
    expect(getRequestOrigin(fakeHeaders({}))).toBeNull();
  });

  it("prefers Origin over Referer when both are present", () => {
    const h = fakeHeaders({
      origin: "https://app.example.com",
      referer: "https://other.example.com/page",
    });
    expect(getRequestOrigin(h)).toBe("https://app.example.com");
  });

  it("returns null for a malformed Referer that cannot be parsed", () => {
    const h = fakeHeaders({ referer: "not-a-url" });
    expect(getRequestOrigin(h)).toBeNull();
  });

  it("trims whitespace from the Origin header value", () => {
    const h = fakeHeaders({ origin: "  https://app.example.com  " });
    expect(getRequestOrigin(h)).toBe("https://app.example.com");
  });
});

// ── isOriginAllowed ───────────────────────────────────────────────────────────

describe("isOriginAllowed", () => {
  const allowed = new Set([
    "https://app.example.com",
    "http://localhost:3000",
  ]);

  it("accepts a known origin (valid origin accepted)", () => {
    expect(isOriginAllowed("https://app.example.com", allowed)).toBe(true);
    expect(isOriginAllowed("http://localhost:3000", allowed)).toBe(true);
  });

  it("rejects an unknown origin (invalid origin rejected)", () => {
    expect(isOriginAllowed("https://evil.attacker.net", allowed)).toBe(false);
    expect(isOriginAllowed("https://app.example.com.evil.net", allowed)).toBe(false);
  });

  it("rejects an origin that differs only in scheme", () => {
    expect(isOriginAllowed("http://app.example.com", allowed)).toBe(false);
  });

  it("rejects an origin that differs only in port", () => {
    expect(isOriginAllowed("https://app.example.com:8443", allowed)).toBe(false);
  });

  it("is case-sensitive — uppercase origin is rejected", () => {
    expect(isOriginAllowed("HTTPS://APP.EXAMPLE.COM", allowed)).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isOriginAllowed("", allowed)).toBe(false);
  });
});

// ── Middleware CSRF behaviour (integration) ───────────────────────────────────
//
// These tests exercise the CSRF logic as it runs inside the middleware by
// importing the middleware directly and constructing NextRequest objects.
// next-auth/jwt is mocked so no real JWT decoding occurs.

const mockGetToken = vi.fn();
vi.mock("next-auth/jwt", () => ({ getToken: mockGetToken }));

// Suppress rate-limiter construction side-effects in the module scope.
vi.mock("@/lib/rate-limit", () => ({
  createMemoryFixedWindowRateLimiter: vi.fn(() => ({
    check: vi.fn(() => ({ allowed: true, remaining: 99, reset: 0 })),
  })),
  getClientIp: vi.fn(() => "127.0.0.1"),
}));

describe("middleware CSRF enforcement", () => {
  let middleware: (req: import("next/server").NextRequest) => Promise<import("next/server").NextResponse>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("NEXTAUTH_SECRET", "test-secret");
    vi.stubEnv("NEXTAUTH_URL", "http://localhost:3000");
    vi.stubEnv("ALLOWED_ORIGINS", "");

    // Re-import so the module picks up the stubbed env vars.
    vi.resetModules();
    const mod = await import("@/middleware");
    middleware = mod.middleware as typeof middleware;
  });

  function makeRequest(
    method: string,
    path: string,
    headers: Record<string, string> = {}
  ) {
    const { NextRequest } = require("next/server");
    return new NextRequest(`http://localhost:3000${path}`, { method, headers });
  }

  // ── authenticated browser requests with valid origin ──────────────────────

  it("allows an authenticated POST with a matching Origin header", async () => {
    mockGetToken.mockResolvedValue({ githubId: "123" });
    const req = makeRequest("POST", "/api/goals", { origin: "http://localhost:3000" });
    const res = await middleware(req);
    expect(res.status).not.toBe(403);
  });

  it("allows an authenticated PATCH with a matching Origin header", async () => {
    mockGetToken.mockResolvedValue({ githubId: "123" });
    const req = makeRequest("PATCH", "/api/user/settings", { origin: "http://localhost:3000" });
    const res = await middleware(req);
    expect(res.status).not.toBe(403);
  });

  it("allows an authenticated DELETE with a matching Origin header", async () => {
    mockGetToken.mockResolvedValue({ githubId: "123" });
    const req = makeRequest("DELETE", "/api/goals/some-id", { origin: "http://localhost:3000" });
    const res = await middleware(req);
    expect(res.status).not.toBe(403);
  });

  it("allows an authenticated PUT with a matching Origin header", async () => {
    mockGetToken.mockResolvedValue({ githubId: "123" });
    const req = makeRequest("PUT", "/api/goals/some-id", { origin: "http://localhost:3000" });
    const res = await middleware(req);
    expect(res.status).not.toBe(403);
  });

  // ── authenticated browser requests with invalid/missing origin ────────────

  it("blocks an authenticated POST from a cross-origin attacker (invalid origin rejected)", async () => {
    mockGetToken.mockResolvedValue({ githubId: "123" });
    const req = makeRequest("POST", "/api/goals", { origin: "https://evil.attacker.net" });
    const res = await middleware(req);
    expect(res.status).toBe(403);
  });

  it("blocks an authenticated DELETE with a cross-origin Referer (invalid origin rejected)", async () => {
    mockGetToken.mockResolvedValue({ githubId: "123" });
    const req = makeRequest("DELETE", "/api/streak/freeze", {
      referer: "https://evil.attacker.net/csrf-page",
    });
    const res = await middleware(req);
    expect(res.status).toBe(403);
  });

  it("blocks an authenticated PATCH with no Origin or Referer header (missing token rejected)", async () => {
    mockGetToken.mockResolvedValue({ githubId: "123" });
    const req = makeRequest("PATCH", "/api/notifications/some-id");
    const res = await middleware(req);
    expect(res.status).toBe(403);
  });

  // ── unauthenticated requests must not be blocked by CSRF ──────────────────

  it("does not apply CSRF check to unauthenticated requests (route will 401 independently)", async () => {
    mockGetToken.mockResolvedValue(null);
    const req = makeRequest("POST", "/api/goals", { origin: "https://evil.attacker.net" });
    const res = await middleware(req);
    expect(res.status).not.toBe(403);
  });

  // ── safe methods are never blocked ───────────────────────────────────────

  it("allows GET requests without an Origin header (GET is a safe method)", async () => {
    mockGetToken.mockResolvedValue({ githubId: "123" });
    const req = makeRequest("GET", "/api/goals");
    const res = await middleware(req);
    expect(res.status).not.toBe(403);
  });

  // ── bearer token clients must not be broken ───────────────────────────────

  it("allows a POST with Authorization: Bearer even without an Origin header (bearer token client)", async () => {
    mockGetToken.mockResolvedValue({ githubId: "123" });
    const req = makeRequest("POST", "/api/local-coding/sync", {
      authorization: "Bearer dt_api_key_abc123",
    });
    const res = await middleware(req);
    expect(res.status).not.toBe(403);
  });

  it("allows a POST with Bearer auth from a cross-origin caller (API client, not browser)", async () => {
    mockGetToken.mockResolvedValue({ githubId: "123" });
    const req = makeRequest("POST", "/api/goals", {
      authorization: "Bearer some-token",
      origin: "https://external-tool.io",
    });
    const res = await middleware(req);
    expect(res.status).not.toBe(403);
  });

  // ── webhook endpoints must not be broken ──────────────────────────────────

  it("allows POST to /api/webhooks/github without Origin (HMAC-authenticated)", async () => {
    mockGetToken.mockResolvedValue({ githubId: "123" });
    const req = makeRequest("POST", "/api/webhooks/github");
    const res = await middleware(req);
    expect(res.status).not.toBe(403);
  });

  it("allows POST to /api/webhooks/dispatch without Origin (bearer-secret-authenticated)", async () => {
    mockGetToken.mockResolvedValue({ githubId: "123" });
    const req = makeRequest("POST", "/api/webhooks/dispatch");
    const res = await middleware(req);
    expect(res.status).not.toBe(403);
  });

  // ── internal cron jobs must not be broken ────────────────────────────────

  it("allows GET to /api/cron/weekly-digest without Origin (cron job)", async () => {
    mockGetToken.mockResolvedValue(null);
    const req = makeRequest("GET", "/api/cron/weekly-digest");
    const res = await middleware(req);
    expect(res.status).not.toBe(403);
  });

  // ── Referer fallback ──────────────────────────────────────────────────────

  it("accepts a valid Referer as a fallback when Origin is absent", async () => {
    mockGetToken.mockResolvedValue({ githubId: "123" });
    const req = makeRequest("POST", "/api/daily-note", {
      referer: "http://localhost:3000/dashboard",
    });
    const res = await middleware(req);
    expect(res.status).not.toBe(403);
  });
});
