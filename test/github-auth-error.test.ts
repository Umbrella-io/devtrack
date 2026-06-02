/**
 * Tests for GitHub credential failure detection and structured error responses.
 *
 * Covers:
 *   - GitHubAuthError class shape
 *   - githubFetch throws GitHubAuthError on 401
 *   - githubGraphQL throws GitHubAuthError on 401
 *   - githubAuthErrorResponse returns correct structure
 *   - Metrics routes return structured auth error when session is revoked
 *   - Metrics routes return structured auth error when GitHub API returns 401
 *   - Non-auth GitHub failures (rate limit, 500) are NOT classified as auth errors
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  GitHubAuthError,
  GitHubApiError,
  GitHubRateLimitError,
  githubFetch,
  githubGraphQL,
  githubAuthErrorResponse,
} from "@/lib/github-fetch";

// ─── hoisted mocks ──────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  fetchFn: vi.fn(),
  supabaseFrom: vi.fn(),
  metricsCache: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: mocks.supabaseFrom },
}));
vi.mock("@/lib/resolve-user", () => ({
  resolveAppUser: vi.fn().mockResolvedValue({ id: "user-uuid" }),
}));
vi.mock("@/lib/metrics-cache", () => ({
  isMetricsCacheBypassed: vi.fn().mockReturnValue(false),
  metricsCacheKey: vi.fn((...args: unknown[]) => String(args.join("-"))),
  METRICS_CACHE_TTL_SECONDS: {
    contributions: 300,
    prs: 300,
    repos: 300,
    streak: 300,
    issues: 300,
    languages: 300,
  },
  withMetricsCache: vi.fn(
    (_opts: unknown, fn: () => unknown) => fn()
  ),
}));
vi.mock("@/lib/github-accounts", () => ({
  getAccountToken: vi.fn().mockResolvedValue(null),
  getAllAccounts: vi.fn().mockResolvedValue([]),
  mergeMetrics: vi.fn().mockReturnValue(null),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
  mocks.getServerSession.mockReset();
});

// ─── GitHubAuthError class ───────────────────────────────────────────────────

describe("GitHubAuthError", () => {
  it("has name GitHubAuthError", () => {
    expect(new GitHubAuthError().name).toBe("GitHubAuthError");
  });

  it("has a meaningful message", () => {
    expect(new GitHubAuthError().message).toMatch(/authentication/i);
  });

  it("is an instance of Error", () => {
    expect(new GitHubAuthError()).toBeInstanceOf(Error);
  });

  it("is not an instance of GitHubApiError", () => {
    expect(new GitHubAuthError()).not.toBeInstanceOf(GitHubApiError);
  });
});

// ─── githubAuthErrorResponse ─────────────────────────────────────────────────

describe("githubAuthErrorResponse", () => {
  it("returns HTTP 401", async () => {
    const res = githubAuthErrorResponse();
    expect(res.status).toBe(401);
  });

  it("returns token_expired error key", async () => {
    const res = githubAuthErrorResponse();
    const body = await res.json();
    expect(body).toEqual({ error: "token_expired" });
  });
});

// ─── githubFetch — 401 handling ──────────────────────────────────────────────

describe("githubFetch — 401", () => {
  it("throws GitHubAuthError on 401", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: { get: () => null },
    });

    await expect(
      githubFetch("https://api.github.com/user", "bad-token")
    ).rejects.toThrow(GitHubAuthError);
  });

  it("does NOT throw GitHubApiError on 401", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: { get: () => null },
    });

    let thrownError: unknown;
    try {
      await githubFetch("https://api.github.com/user", "bad-token");
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).not.toBeInstanceOf(GitHubApiError);
  });

  it("still throws GitHubRateLimitError on 429", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      headers: { get: () => null },
    });

    await expect(
      githubFetch("https://api.github.com/user", "token")
    ).rejects.toThrow(GitHubRateLimitError);
  });

  it("still throws GitHubApiError on 404", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      headers: { get: () => null },
    });

    await expect(
      githubFetch("https://api.github.com/user", "token")
    ).rejects.toThrow(GitHubApiError);
  });
});

// ─── githubGraphQL — 401 handling ────────────────────────────────────────────

describe("githubGraphQL — 401", () => {
  it("throws GitHubAuthError on 401", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: { get: () => null },
    });

    await expect(
      githubGraphQL("{ viewer { login } }", "bad-token")
    ).rejects.toThrow(GitHubAuthError);
  });
});

// ─── /api/metrics/repos — session.error check ───────────────────────────────

describe("GET /api/metrics/repos — TokenRevoked session", () => {
  it("returns token_expired when session.error is TokenRevoked", async () => {
    mocks.getServerSession.mockResolvedValue({
      accessToken: "some-token",
      githubLogin: "alice",
      githubId: "12345",
      error: "TokenRevoked",
    });

    const { GET } = await import("@/app/api/metrics/repos/route");
    const req = new NextRequest("http://localhost/api/metrics/repos");
    const res = await GET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("token_expired");
  });
});

// ─── /api/metrics/repos — GitHub 401 from API ────────────────────────────────

describe("GET /api/metrics/repos — GitHub API 401", () => {
  it("returns token_expired when GitHub Search API returns 401", async () => {
    mocks.getServerSession.mockResolvedValue({
      accessToken: "revoked-token",
      githubLogin: "alice",
      githubId: "12345",
    });

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: { get: () => null },
      json: async () => ({ message: "Bad credentials" }),
    });

    const { GET } = await import("@/app/api/metrics/repos/route");
    const req = new NextRequest("http://localhost/api/metrics/repos");
    const res = await GET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("token_expired");
  });

  it("returns 502 for non-auth GitHub failures (rate limit 403)", async () => {
    mocks.getServerSession.mockResolvedValue({
      accessToken: "valid-token",
      githubLogin: "alice",
      githubId: "12345",
    });

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      headers: { get: (key: string) => key === "X-RateLimit-Remaining" ? "0" : null },
      json: async () => ({ message: "API rate limit exceeded" }),
    });

    const { GET } = await import("@/app/api/metrics/repos/route");
    const req = new NextRequest("http://localhost/api/metrics/repos");
    const res = await GET(req);

    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).not.toBe("token_expired");
  });
});

// ─── /api/metrics/streak — session.error check ───────────────────────────────

describe("GET /api/metrics/streak — TokenRevoked session", () => {
  it("returns token_expired when session.error is TokenRevoked", async () => {
    mocks.getServerSession.mockResolvedValue({
      accessToken: "some-token",
      githubLogin: "alice",
      githubId: "12345",
      error: "TokenRevoked",
    });

    mocks.supabaseFrom.mockReturnValue({
      select: () => ({ eq: () => ({ gte: () => ({ data: [], error: null }) }) }),
      upsert: () => ({ error: null }),
    });

    const { GET } = await import("@/app/api/metrics/streak/route");
    const req = new NextRequest("http://localhost/api/metrics/streak");
    const res = await GET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("token_expired");
  });
});

// ─── /api/metrics/issues — session.error check ───────────────────────────────

describe("GET /api/metrics/issues — TokenRevoked session", () => {
  it("returns token_expired when session.error is TokenRevoked", async () => {
    mocks.getServerSession.mockResolvedValue({
      accessToken: "some-token",
      githubLogin: "alice",
      githubId: "12345",
      error: "TokenRevoked",
    });

    const { GET } = await import("@/app/api/metrics/issues/route");
    const req = new NextRequest("http://localhost/api/metrics/issues");
    const res = await GET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("token_expired");
  });

  it("returns token_expired when GitHub Search API returns 401", async () => {
    mocks.getServerSession.mockResolvedValue({
      accessToken: "revoked-token",
      githubLogin: "alice",
      githubId: "12345",
    });

    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      headers: { get: () => null },
      json: async () => ({ message: "Bad credentials" }),
    });

    const { GET } = await import("@/app/api/metrics/issues/route");
    const req = new NextRequest("http://localhost/api/metrics/issues");
    const res = await GET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("token_expired");
  });
});
