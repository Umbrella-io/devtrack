import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { toDateStr } from "@/lib/dateUtils";

// ─── Shared mocks ────────────────────────────────────────────────────────────

vi.mock("@/lib/metrics-cache", () => ({
  cacheGet: vi.fn().mockResolvedValue(null),
  cacheSet: vi.fn().mockResolvedValue(undefined),
}));

import { cacheGet, cacheSet } from "@/lib/metrics-cache";

// Import under test AFTER mocks are registered.
import {
  calculateCurrentStreak,
  sortAndRank,
  followerCacheKey,
  FOLLOWER_LEADERBOARD_CACHE_PREFIX,
  fetchFollowers,
  fetchCommitsThisMonth,
  fetchMergedPRsThisMonth,
  fetchCurrentStreak,
  buildFollowerLeaderboard,
  getFollowerLeaderboard,
  GitHubRateLimitError,
} from "@/lib/follower-leaderboard";

// ─── calculateCurrentStreak ───────────────────────────────────────────────────

describe("calculateCurrentStreak", () => {
  it("returns 0 for empty input", () => {
    expect(calculateCurrentStreak([])).toBe(0);
  });

  it("returns 1 for a single commit today", () => {
    expect(calculateCurrentStreak([toDateStr(new Date())])).toBe(1);
  });

  it("returns 1 for a single commit yesterday", () => {
    const yesterday = toDateStr(new Date(Date.now() - 86400000));
    expect(calculateCurrentStreak([yesterday])).toBe(1);
  });

  it("returns 0 when the last commit is older than yesterday", () => {
    const twoDaysAgo = toDateStr(new Date(Date.now() - 2 * 86400000));
    expect(calculateCurrentStreak([twoDaysAgo])).toBe(0);
  });

  it("returns correct streak for consecutive days ending today", () => {
    const dates = Array.from({ length: 5 }, (_, i) =>
      toDateStr(new Date(Date.now() - i * 86400000))
    );
    expect(calculateCurrentStreak(dates)).toBe(5);
  });

  it("de-duplicates same-day commits", () => {
    const today = toDateStr(new Date());
    expect(calculateCurrentStreak([today, today, today])).toBe(1);
  });

  it("ignores a long streak that ended two days ago", () => {
    const dates = Array.from({ length: 7 }, (_, i) =>
      toDateStr(new Date(Date.now() - (i + 2) * 86400000))
    );
    expect(calculateCurrentStreak(dates)).toBe(0);
  });

  it("handles ISO timestamp strings (trims to date portion)", () => {
    const today = toDateStr(new Date()) + "T14:00:00Z";
    expect(calculateCurrentStreak([today])).toBe(1);
  });
});

// ─── sortAndRank ─────────────────────────────────────────────────────────────

const makeEntry = (
  username: string,
  streak: number,
  commitsThisMonth: number,
  mergedPullRequests: number
) => ({ username, streak, commitsThisMonth, mergedPullRequests, avatarUrl: "", profileUrl: "" });

describe("sortAndRank", () => {
  it("ranks by streak descending", () => {
    const entries = [makeEntry("alice", 3, 10, 2), makeEntry("bob", 7, 5, 1)];
    const result = sortAndRank(entries, "streak");
    expect(result[0].username).toBe("bob");
    expect(result[0].rank).toBe(1);
    expect(result[1].rank).toBe(2);
  });

  it("ranks by commits descending", () => {
    const entries = [makeEntry("alice", 3, 10, 2), makeEntry("bob", 7, 20, 1)];
    const result = sortAndRank(entries, "commits");
    expect(result[0].username).toBe("bob");
  });

  it("ranks by PRs descending", () => {
    const entries = [makeEntry("alice", 3, 10, 5), makeEntry("bob", 7, 5, 2)];
    const result = sortAndRank(entries, "prs");
    expect(result[0].username).toBe("alice");
  });

  it("tie-breaks on commits then username", () => {
    const entries = [
      makeEntry("zach", 5, 10, 0),
      makeEntry("alice", 5, 10, 0),
      makeEntry("bob", 5, 15, 0),
    ];
    const result = sortAndRank(entries, "streak");
    expect(result[0].username).toBe("bob");   // highest commits
    expect(result[1].username).toBe("alice"); // alpha before zach
    expect(result[2].username).toBe("zach");
  });

  it("assigns ranks starting from 1", () => {
    const entries = [makeEntry("a", 1, 1, 0), makeEntry("b", 2, 2, 0)];
    const ranked = sortAndRank(entries, "streak");
    expect(ranked.map((e) => e.rank)).toEqual([1, 2]);
  });

  it("returns empty array for empty input", () => {
    expect(sortAndRank([], "streak")).toEqual([]);
  });

  it("handles a single entry", () => {
    const result = sortAndRank([makeEntry("solo", 5, 5, 5)], "streak");
    expect(result[0].rank).toBe(1);
  });

  it("handles exactly 20 entries", () => {
    const entries = Array.from({ length: 20 }, (_, i) =>
      makeEntry(`user${i}`, 20 - i, i, 0)
    );
    const result = sortAndRank(entries, "streak");
    expect(result).toHaveLength(20);
    expect(result[0].streak).toBe(20);
    expect(result[19].rank).toBe(20);
  });

  it("handles identical scores deterministically", () => {
    const entries = Array.from({ length: 5 }, (_, i) =>
      makeEntry(`user${String.fromCharCode(101 - i)}`, 5, 5, 5)
    );
    const a = sortAndRank(entries, "streak").map((e) => e.username);
    const b = sortAndRank(entries, "streak").map((e) => e.username);
    expect(a).toEqual(b);
  });

  it("does not mutate the original array", () => {
    const entries = [makeEntry("b", 2, 2, 0), makeEntry("a", 3, 3, 0)];
    const original = entries.map((e) => e.username);
    sortAndRank(entries, "streak");
    expect(entries.map((e) => e.username)).toEqual(original);
  });
});

// ─── followerCacheKey ─────────────────────────────────────────────────────────

describe("followerCacheKey", () => {
  it("includes the prefix and login", () => {
    const key = followerCacheKey("octocat");
    expect(key).toBe(`${FOLLOWER_LEADERBOARD_CACHE_PREFIX}:octocat`);
  });
});

// ─── GitHub fetch helpers ─────────────────────────────────────────────────────

function mockFetch(response: unknown, status = 200) {
  const res = {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(response),
    headers: new Headers(),
  };
  return vi.spyOn(global, "fetch").mockResolvedValueOnce(res as Response);
}

describe("fetchFollowers", () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it("returns an empty array when the API returns null data", async () => {
    mockFetch(null, 404);
    const result = await fetchFollowers("nobody");
    expect(result).toEqual([]);
  });

  it("returns logins for each follower", async () => {
    mockFetch([{ login: "alice" }, { login: "bob" }]);
    const result = await fetchFollowers("octocat");
    expect(result).toEqual(["alice", "bob"]);
  });

  it("limits to 20 even if the API returns more", async () => {
    const many = Array.from({ length: 25 }, (_, i) => ({ login: `user${i}` }));
    mockFetch(many);
    const result = await fetchFollowers("octocat");
    expect(result).toHaveLength(20);
  });

  it("handles zero followers gracefully", async () => {
    mockFetch([]);
    const result = await fetchFollowers("octocat");
    expect(result).toEqual([]);
  });

  it("returns empty array on network error", async () => {
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("network"));
    const result = await fetchFollowers("octocat");
    expect(result).toEqual([]);
  });
});

describe("fetchCommitsThisMonth", () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it("returns total_count from search API", async () => {
    mockFetch({ total_count: 42, items: [] });
    const result = await fetchCommitsThisMonth("alice");
    expect(result).toBe(42);
  });

  it("returns 0 when API fails", async () => {
    mockFetch(null, 422);
    const result = await fetchCommitsThisMonth("alice");
    expect(result).toBe(0);
  });
});

describe("fetchMergedPRsThisMonth", () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it("returns total_count from issues search", async () => {
    mockFetch({ total_count: 7, items: [] });
    const result = await fetchMergedPRsThisMonth("alice");
    expect(result).toBe(7);
  });

  it("returns 0 on API error", async () => {
    mockFetch(null, 422);
    const result = await fetchMergedPRsThisMonth("alice");
    expect(result).toBe(0);
  });
});

describe("fetchCurrentStreak", () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it("returns 0 when no events found", async () => {
    mockFetch([]);
    const result = await fetchCurrentStreak("alice");
    expect(result).toBe(0);
  });

  it("returns 0 when API returns null", async () => {
    mockFetch(null, 404);
    const result = await fetchCurrentStreak("alice");
    expect(result).toBe(0);
  });

  it("computes streak from PushEvents", async () => {
    const today = toDateStr(new Date()) + "T12:00:00Z";
    const yesterday = toDateStr(new Date(Date.now() - 86400000)) + "T12:00:00Z";
    mockFetch([
      { type: "PushEvent", created_at: today },
      { type: "PushEvent", created_at: yesterday },
      { type: "WatchEvent", created_at: today },
    ]);
    const result = await fetchCurrentStreak("alice");
    expect(result).toBe(2);
  });

  it("ignores non-PushEvent entries", async () => {
    mockFetch([{ type: "WatchEvent", created_at: toDateStr(new Date()) + "T00:00:00Z" }]);
    const result = await fetchCurrentStreak("alice");
    expect(result).toBe(0);
  });
});

// ─── Rate limit error ─────────────────────────────────────────────────────────

describe("GitHubRateLimitError", () => {
  it("captures retryAfterSeconds", () => {
    const err = new GitHubRateLimitError(60);
    expect(err.retryAfterSeconds).toBe(60);
    expect(err.name).toBe("GitHubRateLimitError");
  });

  it("is an instance of Error", () => {
    expect(new GitHubRateLimitError(30)).toBeInstanceOf(Error);
  });
});

// ─── buildFollowerLeaderboard ─────────────────────────────────────────────────

describe("buildFollowerLeaderboard", () => {
  afterEach(() => { vi.restoreAllMocks(); });

  function mockSequentialFetches(responses: Array<{ ok: boolean; status: number; data: unknown }>) {
    let i = 0;
    vi.spyOn(global, "fetch").mockImplementation(() => {
      const r = responses[i++ % responses.length];
      return Promise.resolve({
        ok: r.ok,
        status: r.status,
        json: () => Promise.resolve(r.data),
        headers: new Headers(),
      } as Response);
    });
  }

  it("returns empty entries when user has 0 followers", async () => {
    mockSequentialFetches([{ ok: true, status: 200, data: [] }]);
    const result = await buildFollowerLeaderboard("octocat");
    expect(result.entries).toHaveLength(0);
    expect(result.metric).toBe("streak");
  });

  it("builds and sorts a single follower entry", async () => {
    mockSequentialFetches([
      // fetchFollowers
      { ok: true, status: 200, data: [{ login: "alice" }] },
      // fetchCurrentStreak (events)
      { ok: true, status: 200, data: [{ type: "PushEvent", created_at: toDateStr(new Date()) + "T00:00:00Z" }] },
      // fetchCommitsThisMonth
      { ok: true, status: 200, data: { total_count: 5 } },
      // fetchMergedPRsThisMonth
      { ok: true, status: 200, data: { total_count: 2 } },
    ]);
    const result = await buildFollowerLeaderboard("octocat");
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].username).toBe("alice");
    expect(result.entries[0].rank).toBe(1);
    expect(result.entries[0].streak).toBe(1);
    expect(result.entries[0].commitsThisMonth).toBe(5);
    expect(result.entries[0].mergedPullRequests).toBe(2);
  });

  it("applies the requested sort metric", async () => {
    mockSequentialFetches([
      // followers
      { ok: true, status: 200, data: [{ login: "alice" }, { login: "bob" }] },
      // alice events (streak 2)
      { ok: true, status: 200, data: [
        { type: "PushEvent", created_at: toDateStr(new Date()) + "T00:00:00Z" },
        { type: "PushEvent", created_at: toDateStr(new Date(Date.now() - 86400000)) + "T00:00:00Z" },
      ]},
      // alice commits
      { ok: true, status: 200, data: { total_count: 3 } },
      // alice PRs
      { ok: true, status: 200, data: { total_count: 1 } },
      // bob events (streak 1)
      { ok: true, status: 200, data: [{ type: "PushEvent", created_at: toDateStr(new Date()) + "T00:00:00Z" }] },
      // bob commits (more than alice)
      { ok: true, status: 200, data: { total_count: 10 } },
      // bob PRs
      { ok: true, status: 200, data: { total_count: 0 } },
    ]);
    const result = await buildFollowerLeaderboard("octocat", "commits");
    expect(result.entries[0].username).toBe("bob");
    expect(result.metric).toBe("commits");
  });

  it("includes generatedAt timestamp", async () => {
    mockSequentialFetches([{ ok: true, status: 200, data: [] }]);
    const result = await buildFollowerLeaderboard("octocat");
    expect(new Date(result.generatedAt).getTime()).toBeGreaterThan(0);
  });
});

// ─── getFollowerLeaderboard (cache integration) ───────────────────────────────

describe("getFollowerLeaderboard (cache integration)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cacheGet).mockResolvedValue(null);
    vi.mocked(cacheSet).mockResolvedValue(undefined);
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it("returns cached payload and does not call GitHub", async () => {
    const cached = {
      generatedAt: new Date().toISOString(),
      metric: "streak" as const,
      entries: [
        {
          rank: 1,
          username: "alice",
          avatarUrl: "a",
          profileUrl: "p",
          streak: 5,
          commitsThisMonth: 10,
          mergedPullRequests: 2,
        },
      ],
    };
    vi.mocked(cacheGet).mockResolvedValueOnce(cached);
    const fetchSpy = vi.spyOn(global, "fetch");

    const result = await getFollowerLeaderboard("octocat", "streak");
    expect(result.entries).toHaveLength(1);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("re-sorts cached entries without hitting GitHub", async () => {
    const cached = {
      generatedAt: new Date().toISOString(),
      metric: "streak" as const,
      entries: [
        { rank: 1, username: "alice", avatarUrl: "", profileUrl: "", streak: 5, commitsThisMonth: 2, mergedPullRequests: 1 },
        { rank: 2, username: "bob", avatarUrl: "", profileUrl: "", streak: 3, commitsThisMonth: 8, mergedPullRequests: 0 },
      ],
    };
    vi.mocked(cacheGet).mockResolvedValueOnce(cached);
    const fetchSpy = vi.spyOn(global, "fetch");

    const result = await getFollowerLeaderboard("octocat", "commits");
    expect(result.entries[0].username).toBe("bob"); // more commits
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.metric).toBe("commits");
  });

  it("fetches from GitHub on a cache miss and stores result", async () => {
    vi.mocked(cacheGet).mockResolvedValue(null);
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
      headers: new Headers(),
    } as Response);

    await getFollowerLeaderboard("octocat");
    expect(cacheSet).toHaveBeenCalledOnce();
  });

  it("bypasses cache when bypassCache=true", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
      headers: new Headers(),
    } as Response);

    await getFollowerLeaderboard("octocat", "streak", true);
    expect(cacheGet).not.toHaveBeenCalled();
  });
});

