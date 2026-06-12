import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Module mocks (hoisted) ───────────────────────────────────────────────────

vi.mock("@/lib/metrics-cache", () => ({
  cacheGet: vi.fn().mockResolvedValue(null),
  cacheSet: vi.fn().mockResolvedValue(undefined),
  isMetricsCacheBypassed: vi.fn().mockReturnValue(false),
}));

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));

vi.mock("@/lib/follower-leaderboard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/follower-leaderboard")>();
  return { ...actual, getFollowerLeaderboard: vi.fn() };
});

vi.mock("@/lib/upstash-rest", () => ({
  getUpstashConfig: () => null,
  upstashRateLimitFixedWindow: vi.fn(),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { getServerSession } from "next-auth";
import { GET } from "@/app/api/leaderboard/followers/route";
import { NextRequest } from "next/server";
import {
  getFollowerLeaderboard as mockGetFollowerLeaderboard,
  GitHubRateLimitError,
} from "@/lib/follower-leaderboard";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/leaderboard/followers", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockResolvedValue({
      githubLogin: "octocat",
      githubId: "1",
      user: { name: "Octocat" },
    } as any);
    vi.mocked(mockGetFollowerLeaderboard).mockResolvedValue({
      generatedAt: new Date().toISOString(),
      metric: "streak",
      entries: [],
    });
  });

  afterEach(() => { vi.clearAllMocks(); });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const req = new NextRequest("http://localhost/api/leaderboard/followers");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 200 with payload for authenticated user", async () => {
    const req = new NextRequest("http://localhost/api/leaderboard/followers");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("entries");
    expect(body).toHaveProperty("generatedAt");
  });

  it("passes sort param to service", async () => {
    const req = new NextRequest("http://localhost/api/leaderboard/followers?sort=commits");
    await GET(req);
    expect(mockGetFollowerLeaderboard).toHaveBeenCalledWith("octocat", "commits", false);
  });

  it("defaults sort to streak for unknown values", async () => {
    const req = new NextRequest("http://localhost/api/leaderboard/followers?sort=invalid");
    await GET(req);
    expect(mockGetFollowerLeaderboard).toHaveBeenCalledWith("octocat", "streak", false);
  });

  it("returns 503 on GitHubRateLimitError", async () => {
    vi.mocked(mockGetFollowerLeaderboard).mockRejectedValueOnce(
      new GitHubRateLimitError(60)
    );
    const req = new NextRequest("http://localhost/api/leaderboard/followers");
    const res = await GET(req);
    expect(res.status).toBe(503);
    expect(res.headers.get("Retry-After")).toBe("60");
  });

  it("returns 500 on unexpected errors", async () => {
    vi.mocked(mockGetFollowerLeaderboard).mockRejectedValueOnce(new Error("db down"));
    const req = new NextRequest("http://localhost/api/leaderboard/followers");
    const res = await GET(req);
    expect(res.status).toBe(500);
  });

  it("returns empty entries for user with 0 followers", async () => {
    vi.mocked(mockGetFollowerLeaderboard).mockResolvedValueOnce({
      generatedAt: new Date().toISOString(),
      metric: "streak",
      entries: [],
    });
    const req = new NextRequest("http://localhost/api/leaderboard/followers");
    const res = await GET(req);
    const body = await res.json();
    expect(body.entries).toHaveLength(0);
  });
});
