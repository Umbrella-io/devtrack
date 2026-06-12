import { describe, it, expect, vi, beforeEach } from "vitest";
import { toDateStr } from "@/lib/dateUtils";

// ─── Shared mocks ────────────────────────────────────────────────────────────

vi.mock("@/lib/metrics-cache", () => ({
  cacheGet: vi.fn().mockResolvedValue(null),
  cacheSet: vi.fn().mockResolvedValue(undefined),
  isMetricsCacheBypassed: vi.fn().mockReturnValue(false),
}));

import { cacheGet, cacheSet } from "@/lib/metrics-cache";

// Import after mocks
import {
  orgAnalyticsCacheKey,
  ORG_ANALYTICS_CACHE_PREFIX,
  ORG_MAX_MEMBERS,
  GitHubRateLimitError,
  fetchOrgMembers,
  fetchMemberStats,
  buildOrgAnalytics,
  getOrgAnalytics,
  type OrgMemberStats,
  type OrgAnalyticsPayload,
} from "@/lib/orgAnalytics";

// ─── orgAnalyticsCacheKey ─────────────────────────────────────────────────────

describe("orgAnalyticsCacheKey", () => {
  it("lowercases org name", () => {
    expect(orgAnalyticsCacheKey("MyOrg")).toBe(`${ORG_ANALYTICS_CACHE_PREFIX}:myorg`);
  });

  it("handles already lowercase name", () => {
    expect(orgAnalyticsCacheKey("vercel")).toBe(`${ORG_ANALYTICS_CACHE_PREFIX}:vercel`);
  });

  it("handles hyphenated org names", () => {
    expect(orgAnalyticsCacheKey("My-Org-Name")).toBe(`${ORG_ANALYTICS_CACHE_PREFIX}:my-org-name`);
  });
});

// ─── GitHubRateLimitError ─────────────────────────────────────────────────────

describe("GitHubRateLimitError", () => {
  it("stores retryAfterSeconds", () => {
    const err = new GitHubRateLimitError(120);
    expect(err.retryAfterSeconds).toBe(120);
    expect(err.name).toBe("GitHubRateLimitError");
    expect(err.message).toBe("GitHub rate limit reached");
    expect(err).toBeInstanceOf(Error);
  });
});

// ─── fetchOrgMembers ──────────────────────────────────────────────────────────

describe("fetchOrgMembers", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("returns empty array when org not found (404)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(null, { status: 404 }) as Response
    );
    const members = await fetchOrgMembers("nonexistent-org-xyz");
    expect(members).toEqual([]);
  });

  it("returns empty array on network error", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));
    const members = await fetchOrgMembers("some-org");
    expect(members).toEqual([]);
  });

  it("caps members at ORG_MAX_MEMBERS (30)", async () => {
    const logins = Array.from({ length: 50 }, (_, i) => ({ login: `user${i}` }));
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(logins), { status: 200 }) as Response
    );
    const members = await fetchOrgMembers("big-org");
    expect(members.length).toBeLessThanOrEqual(ORG_MAX_MEMBERS);
    expect(members.length).toBe(ORG_MAX_MEMBERS);
  });

  it("filters out members with no login", async () => {
    const logins = [{ login: "alice" }, {}, { login: "bob" }, { login: null }];
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(logins), { status: 200 }) as Response
    );
    const members = await fetchOrgMembers("sparse-org");
    expect(members).toEqual(["alice", "bob"]);
  });

  it("throws GitHubRateLimitError on 403", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(null, {
        status: 403,
        headers: { "Retry-After": "60" },
      }) as Response
    );
    await expect(fetchOrgMembers("rate-limited-org")).rejects.toBeInstanceOf(
      GitHubRateLimitError
    );
  });

  it("throws GitHubRateLimitError on 429", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(null, {
        status: 429,
        headers: { "Retry-After": "30" },
      }) as Response
    );
    await expect(fetchOrgMembers("rate-limited-org")).rejects.toBeInstanceOf(
      GitHubRateLimitError
    );
  });
});

// ─── fetchMemberStats ─────────────────────────────────────────────────────────

describe("fetchMemberStats", () => {
  const since = toDateStr(new Date(Date.now() - 30 * 86400000));

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("returns zero stats on all API failures", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(null, { status: 500 }) as Response
    );
    const stats = await fetchMemberStats("failuser", since);
    expect(stats.commits).toBe(0);
    expect(stats.mergedPRs).toBe(0);
    expect(stats.streak).toBe(0);
    expect(stats.username).toBe("failuser");
  });

  it("constructs correct avatarUrl", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ total_count: 0 }), { status: 200 }) as Response
    );
    // streak fetch returns empty array
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ total_count: 5 }), { status: 200 }) as Response
    );
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ total_count: 2 }), { status: 200 }) as Response
    );
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify([]), { status: 200 }) as Response
    );
    const stats = await fetchMemberStats("alice", since);
    expect(stats.avatarUrl).toBe("https://github.com/alice.png?size=96");
  });

  it("propagates GitHubRateLimitError from commits fetch", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(null, {
        status: 403,
        headers: { "Retry-After": "60" },
      }) as Response
    );
    await expect(fetchMemberStats("ratelimited", since)).rejects.toBeInstanceOf(
      GitHubRateLimitError
    );
  });
});

// ─── buildOrgAnalytics — ranking logic ───────────────────────────────────────

describe("buildOrgAnalytics ranking", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  function mockMembers(usernames: string[]): void {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify(usernames.map((login) => ({ login }))),
        { status: 200 }
      ) as Response
    );
  }

  function mockMemberStats(commits: number, prs: number, pushDates: string[]): void {
    // commits search
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ total_count: commits }), { status: 200 }) as Response
    );
    // PRs search
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ total_count: prs }), { status: 200 }) as Response
    );
    // events (streak)
    const events = pushDates.map((d) => ({ type: "PushEvent", created_at: `${d}T12:00:00Z` }));
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(events), { status: 200 }) as Response
    );
  }

  it("returns empty payload for org with no members", async () => {
    mockMembers([]);
    const payload = await buildOrgAnalytics("empty-org");
    expect(payload.totalCommits).toBe(0);
    expect(payload.activeContributors).toBe(0);
    expect(payload.totalMergedPRs).toBe(0);
    expect(payload.topStreaks).toHaveLength(0);
    expect(payload.members).toHaveLength(0);
  });

  it("computes correct commit totals", async () => {
    mockMembers(["alice", "bob"]);
    mockMemberStats(10, 2, []);  // alice
    mockMemberStats(5, 1, []);   // bob
    const payload = await buildOrgAnalytics("test-org");
    expect(payload.totalCommits).toBe(15);
    expect(payload.totalMergedPRs).toBe(3);
  });

  it("counts active contributors (at least 1 commit)", async () => {
    mockMembers(["alice", "bob", "carol"]);
    mockMemberStats(5, 0, []);   // alice — active
    mockMemberStats(0, 3, []);   // bob — inactive (0 commits)
    mockMemberStats(1, 0, []);   // carol — active
    const payload = await buildOrgAnalytics("test-org");
    expect(payload.activeContributors).toBe(2);
  });

  it("top streaks sorted by streak desc, then commits desc, then username asc", async () => {
    const today = toDateStr(new Date());
    const yesterday = toDateStr(new Date(Date.now() - 86400000));
    const twoDaysAgo = toDateStr(new Date(Date.now() - 2 * 86400000));

    mockMembers(["alice", "bob", "carol"]);
    // alice: streak=2 (today+yesterday), commits=10
    mockMemberStats(10, 0, [today, yesterday]);
    // bob: streak=3 (today+yesterday+2daysAgo), commits=5
    mockMemberStats(5, 0, [today, yesterday, twoDaysAgo]);
    // carol: streak=2 (today+yesterday), commits=8
    mockMemberStats(8, 0, [today, yesterday]);

    const payload = await buildOrgAnalytics("test-org");
    const ranks = payload.topStreaks.map((e) => e.username);
    // bob first (streak 3), then alice (streak 2, commits 10 > 8), then carol
    expect(ranks[0]).toBe("bob");
    expect(ranks[1]).toBe("alice");
    expect(ranks[2]).toBe("carol");
  });

  it("top committers sorted by commits desc, then streak desc, then username asc", async () => {
    const today = toDateStr(new Date());
    const yesterday = toDateStr(new Date(Date.now() - 86400000));

    mockMembers(["alice", "bob", "carol"]);
    mockMemberStats(10, 0, [today]);          // alice: commits=10, streak=1
    mockMemberStats(10, 0, [today, yesterday]); // bob: commits=10, streak=2
    mockMemberStats(15, 0, []);              // carol: commits=15, streak=0

    const payload = await buildOrgAnalytics("test-org");
    const ranks = payload.topCommitters.map((e) => e.username);
    expect(ranks[0]).toBe("carol");    // most commits
    expect(ranks[1]).toBe("bob");      // same commits as alice, better streak
    expect(ranks[2]).toBe("alice");
  });

  it("top PR contributors sorted by mergedPRs desc, then commits desc, then username asc", async () => {
    mockMembers(["alice", "bob", "carol"]);
    mockMemberStats(5, 10, []);   // alice: prs=10
    mockMemberStats(8, 10, []);   // bob: prs=10, more commits
    mockMemberStats(3, 15, []);   // carol: prs=15

    const payload = await buildOrgAnalytics("test-org");
    const ranks = payload.topPRContributors.map((e) => e.username);
    expect(ranks[0]).toBe("carol");   // most PRs
    expect(ranks[1]).toBe("bob");     // same PRs as alice, more commits
    expect(ranks[2]).toBe("alice");
  });

  it("returns at most 5 entries in each leaderboard", async () => {
    const usernames = Array.from({ length: 10 }, (_, i) => `user${i}`);
    mockMembers(usernames);
    for (let i = 0; i < 10; i++) {
      mockMemberStats(i, i, []);
    }
    const payload = await buildOrgAnalytics("test-org");
    expect(payload.topStreaks.length).toBeLessThanOrEqual(5);
    expect(payload.topCommitters.length).toBeLessThanOrEqual(5);
    expect(payload.topPRContributors.length).toBeLessThanOrEqual(5);
  });

  it("assigns rank 1–N to top contributors", async () => {
    mockMembers(["alice", "bob", "carol"]);
    mockMemberStats(10, 2, []);
    mockMemberStats(5, 1, []);
    mockMemberStats(1, 0, []);
    const payload = await buildOrgAnalytics("test-org");
    payload.topCommitters.forEach((entry, i) => {
      expect(entry.rank).toBe(i + 1);
    });
  });

  it("paginates members correctly", async () => {
    const usernames = Array.from({ length: 6 }, (_, i) => `user${i}`);
    mockMembers(usernames);
    for (let i = 0; i < 6; i++) {
      mockMemberStats(i * 2, 0, []);
    }
    const payload = await buildOrgAnalytics("test-org", 2, 3);
    expect(payload.members.length).toBe(3);
    expect(payload.pagination.page).toBe(2);
    expect(payload.pagination.totalPages).toBe(2);
    expect(payload.pagination.total).toBe(6);
  });

  it("handles exactly 30 members", async () => {
    const usernames = Array.from({ length: 30 }, (_, i) => `user${i}`);
    mockMembers(usernames);
    for (let i = 0; i < 30; i++) {
      mockMemberStats(i, 0, []);
    }
    const payload = await buildOrgAnalytics("test-org", 1, 30);
    expect(payload.members.length).toBe(30);
    expect(payload.pagination.total).toBe(30);
  });

  it("tie-breaks by username asc when all metrics equal", async () => {
    mockMembers(["zara", "alice", "bob"]);
    mockMemberStats(5, 2, []);
    mockMemberStats(5, 2, []);
    mockMemberStats(5, 2, []);
    const payload = await buildOrgAnalytics("test-org");
    const usernames = payload.topCommitters.map((e) => e.username);
    const sorted = [...usernames].sort();
    expect(usernames).toEqual(sorted);
  });
});

// ─── getOrgAnalytics — caching ───────────────────────────────────────────────

describe("getOrgAnalytics caching", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.mocked(cacheGet).mockReset();
    vi.mocked(cacheSet).mockReset();
    vi.mocked(cacheGet).mockResolvedValue(null);
    vi.mocked(cacheSet).mockResolvedValue(undefined);
  });

  it("returns cached payload without calling fetch", async () => {
    const cached = {
      organization: "cached-org",
      generatedAt: new Date().toISOString(),
      totalCommits: 42,
      activeContributors: 3,
      totalMergedPRs: 7,
      topStreaks: [],
      topCommitters: [],
      topPRContributors: [],
      allMembers: [
        { rank: 1, username: "alice", avatarUrl: "https://github.com/alice.png?size=96", commits: 42, streak: 0, mergedPRs: 7 },
      ],
    };
    vi.mocked(cacheGet).mockResolvedValueOnce(cached);

    const result = await getOrgAnalytics("cached-org", 1, 10);
    expect(result).not.toBeNull();
    expect(result?.totalCommits).toBe(42);
    expect(result?.organization).toBe("cached-org");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("calls cacheSet after a cache miss", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify([{ login: "alice" }]), { status: 200 }) as Response
    );
    // alice stats: commits, PRs, events
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ total_count: 3 }), { status: 200 }) as Response
    );
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ total_count: 1 }), { status: 200 }) as Response
    );
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify([]), { status: 200 }) as Response
    );

    await getOrgAnalytics("miss-org", 1, 10);
    expect(cacheSet).toHaveBeenCalledOnce();
  });

  it("bypasses cache when bypassCache=true", async () => {
    const cached = {
      organization: "bypass-org",
      generatedAt: new Date().toISOString(),
      totalCommits: 99,
      activeContributors: 1,
      totalMergedPRs: 0,
      topStreaks: [],
      topCommitters: [],
      topPRContributors: [],
      allMembers: [],
    };
    vi.mocked(cacheGet).mockResolvedValueOnce(cached);

    // org fetch returns empty — bypassed cache means fresh fetch
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify([]), { status: 200 }) as Response
    );

    const result = await getOrgAnalytics("bypass-org", 1, 10, true);
    expect(cacheGet).not.toHaveBeenCalled();
    expect(result?.totalCommits).toBe(0); // fresh empty org, not 99
  });

  it("returns null on rate limit error", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(null, {
        status: 429,
        headers: { "Retry-After": "60" },
      }) as Response
    );
    const result = await getOrgAnalytics("ratelimited-org");
    expect(result).toBeNull();
  });

  it("paginates from cached allMembers without re-fetching", async () => {
    const allMembers: OrgMemberStats[] = Array.from({ length: 15 }, (_, i) => ({
      rank: i + 1,
      username: `user${i}`,
      avatarUrl: `https://github.com/user${i}.png?size=96`,
      commits: 15 - i,
      streak: 0,
      mergedPRs: 0,
    }));
    const cached = {
      organization: "paged-org",
      generatedAt: new Date().toISOString(),
      totalCommits: 120,
      activeContributors: 15,
      totalMergedPRs: 0,
      topStreaks: [],
      topCommitters: [],
      topPRContributors: [],
      allMembers,
    };
    vi.mocked(cacheGet).mockResolvedValueOnce(cached);

    const page2 = await getOrgAnalytics("paged-org", 2, 5);
    expect(page2?.members.length).toBe(5);
    expect(page2?.pagination.page).toBe(2);
    expect(page2?.pagination.totalPages).toBe(3);
    expect(fetch).not.toHaveBeenCalled();
  });
});
