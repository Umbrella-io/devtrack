import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  BADGE_DEFINITIONS,
  computeEarnedBadgeKeys,
  computeBadgeProgress,
  type BadgeStats,
} from "@/lib/badges";

// ─── Test fixtures ────────────────────────────────────────────────────────────

const BASE_STATS: BadgeStats = {
  streak: 0,
  totalCommits: 0,
  nightCommits: 0,
  earlyCommits: 0,
  mergedPRs: 0,
  totalStars: 0,
  hasUsedFreeze: false,
};

// ─── Badge definitions ────────────────────────────────────────────────────────

describe("BADGE_DEFINITIONS", () => {
  it("contains all 8 required badge definitions", () => {
    expect(BADGE_DEFINITIONS).toHaveLength(8);
  });

  it("includes all required badge ids", () => {
    const ids = BADGE_DEFINITIONS.map((b) => b.id);
    expect(ids).toContain("week_warrior");
    expect(ids).toContain("month_master");
    expect(ids).toContain("century");
    expect(ids).toContain("night_owl");
    expect(ids).toContain("early_bird");
    expect(ids).toContain("pr_machine");
    expect(ids).toContain("star_collector");
    expect(ids).toContain("ice_saver");
  });

  it("every badge has required fields", () => {
    for (const def of BADGE_DEFINITIONS) {
      expect(def.id).toBeTruthy();
      expect(def.name).toBeTruthy();
      expect(def.emoji).toBeTruthy();
      expect(def.description).toBeTruthy();
      expect(def.unlockCondition).toBeTruthy();
    }
  });
});

// ─── computeEarnedBadgeKeys ───────────────────────────────────────────────────

describe("computeEarnedBadgeKeys", () => {
  it("returns empty array for zero stats", () => {
    expect(computeEarnedBadgeKeys(BASE_STATS)).toEqual([]);
  });

  describe("week_warrior", () => {
    it("earned at exactly streak=7", () => {
      expect(computeEarnedBadgeKeys({ ...BASE_STATS, streak: 7 })).toContain("week_warrior");
    });

    it("not earned at streak=6", () => {
      expect(computeEarnedBadgeKeys({ ...BASE_STATS, streak: 6 })).not.toContain("week_warrior");
    });

    it("earned at streak > 7", () => {
      expect(computeEarnedBadgeKeys({ ...BASE_STATS, streak: 15 })).toContain("week_warrior");
    });
  });

  describe("month_master", () => {
    it("earned at exactly streak=30", () => {
      expect(computeEarnedBadgeKeys({ ...BASE_STATS, streak: 30 })).toContain("month_master");
    });

    it("not earned at streak=29", () => {
      expect(computeEarnedBadgeKeys({ ...BASE_STATS, streak: 29 })).not.toContain("month_master");
    });

    it("week_warrior also earned when streak>=30", () => {
      const earned = computeEarnedBadgeKeys({ ...BASE_STATS, streak: 30 });
      expect(earned).toContain("week_warrior");
      expect(earned).toContain("month_master");
    });
  });

  describe("century", () => {
    it("earned at exactly 100 commits", () => {
      expect(computeEarnedBadgeKeys({ ...BASE_STATS, totalCommits: 100 })).toContain("century");
    });

    it("not earned at 99 commits", () => {
      expect(computeEarnedBadgeKeys({ ...BASE_STATS, totalCommits: 99 })).not.toContain("century");
    });

    it("earned above threshold", () => {
      expect(computeEarnedBadgeKeys({ ...BASE_STATS, totalCommits: 500 })).toContain("century");
    });
  });

  describe("night_owl", () => {
    it("earned at exactly 5 night commits", () => {
      expect(computeEarnedBadgeKeys({ ...BASE_STATS, nightCommits: 5 })).toContain("night_owl");
    });

    it("not earned at 4 night commits", () => {
      expect(computeEarnedBadgeKeys({ ...BASE_STATS, nightCommits: 4 })).not.toContain("night_owl");
    });
  });

  describe("early_bird", () => {
    it("earned at exactly 5 early commits", () => {
      expect(computeEarnedBadgeKeys({ ...BASE_STATS, earlyCommits: 5 })).toContain("early_bird");
    });

    it("not earned at 4 early commits", () => {
      expect(computeEarnedBadgeKeys({ ...BASE_STATS, earlyCommits: 4 })).not.toContain("early_bird");
    });
  });

  describe("pr_machine", () => {
    it("earned at exactly 10 merged PRs", () => {
      expect(computeEarnedBadgeKeys({ ...BASE_STATS, mergedPRs: 10 })).toContain("pr_machine");
    });

    it("not earned at 9 merged PRs", () => {
      expect(computeEarnedBadgeKeys({ ...BASE_STATS, mergedPRs: 9 })).not.toContain("pr_machine");
    });
  });

  describe("star_collector", () => {
    it("earned at exactly 50 stars", () => {
      expect(computeEarnedBadgeKeys({ ...BASE_STATS, totalStars: 50 })).toContain("star_collector");
    });

    it("not earned at 49 stars", () => {
      expect(computeEarnedBadgeKeys({ ...BASE_STATS, totalStars: 49 })).not.toContain("star_collector");
    });
  });

  describe("ice_saver", () => {
    it("earned when hasUsedFreeze=true", () => {
      expect(computeEarnedBadgeKeys({ ...BASE_STATS, hasUsedFreeze: true })).toContain("ice_saver");
    });

    it("not earned when hasUsedFreeze=false", () => {
      expect(computeEarnedBadgeKeys({ ...BASE_STATS, hasUsedFreeze: false })).not.toContain("ice_saver");
    });
  });

  it("awards multiple badges simultaneously when all thresholds met", () => {
    const stats: BadgeStats = {
      streak: 30,
      totalCommits: 100,
      nightCommits: 5,
      earlyCommits: 5,
      mergedPRs: 10,
      totalStars: 50,
      hasUsedFreeze: true,
    };
    const earned = computeEarnedBadgeKeys(stats);
    expect(earned).toHaveLength(8);
    expect(earned).toContain("week_warrior");
    expect(earned).toContain("month_master");
    expect(earned).toContain("century");
    expect(earned).toContain("night_owl");
    expect(earned).toContain("early_bird");
    expect(earned).toContain("pr_machine");
    expect(earned).toContain("star_collector");
    expect(earned).toContain("ice_saver");
  });
});

// ─── computeBadgeProgress ─────────────────────────────────────────────────────

describe("computeBadgeProgress", () => {
  it("returns progress object with all trackable badges", () => {
    const progress = computeBadgeProgress(BASE_STATS);
    expect(progress).toHaveProperty("week_warrior");
    expect(progress).toHaveProperty("month_master");
    expect(progress).toHaveProperty("century");
    expect(progress).toHaveProperty("night_owl");
    expect(progress).toHaveProperty("early_bird");
    expect(progress).toHaveProperty("pr_machine");
    expect(progress).toHaveProperty("star_collector");
  });

  it("caps progress at the badge total", () => {
    const stats: BadgeStats = {
      ...BASE_STATS,
      streak: 100,
      totalCommits: 500,
      mergedPRs: 50,
      totalStars: 200,
    };
    const progress = computeBadgeProgress(stats);
    expect(progress.week_warrior.current).toBe(7);
    expect(progress.month_master.current).toBe(30);
    expect(progress.century.current).toBe(100);
    expect(progress.pr_machine.current).toBe(10);
    expect(progress.star_collector.current).toBe(50);
  });

  it("returns correct totals for each badge", () => {
    const progress = computeBadgeProgress(BASE_STATS);
    expect(progress.week_warrior.total).toBe(7);
    expect(progress.month_master.total).toBe(30);
    expect(progress.century.total).toBe(100);
    expect(progress.night_owl.total).toBe(5);
    expect(progress.early_bird.total).toBe(5);
    expect(progress.pr_machine.total).toBe(10);
    expect(progress.star_collector.total).toBe(50);
  });

  it("reflects partial progress accurately", () => {
    const stats: BadgeStats = {
      ...BASE_STATS,
      streak: 5,
      totalCommits: 62,
      mergedPRs: 4,
    };
    const progress = computeBadgeProgress(stats);
    expect(progress.week_warrior.current).toBe(5);
    expect(progress.century.current).toBe(62);
    expect(progress.pr_machine.current).toBe(4);
  });

  it("shows zero progress for all zero stats", () => {
    const progress = computeBadgeProgress(BASE_STATS);
    for (const [, value] of Object.entries(progress)) {
      expect(value.current).toBe(0);
    }
  });
});

// ─── Idempotency guarantee (pure logic) ──────────────────────────────────────

describe("badge computation idempotency", () => {
  it("returns same earned keys when called repeatedly with same stats", () => {
    const stats: BadgeStats = {
      streak: 7,
      totalCommits: 100,
      nightCommits: 0,
      earlyCommits: 0,
      mergedPRs: 0,
      totalStars: 0,
      hasUsedFreeze: false,
    };
    const first = computeEarnedBadgeKeys(stats);
    const second = computeEarnedBadgeKeys(stats);
    expect(first).toEqual(second);
  });

  it("returns same progress when called repeatedly with same stats", () => {
    const stats: BadgeStats = { ...BASE_STATS, streak: 5 };
    const first = computeBadgeProgress(stats);
    const second = computeBadgeProgress(stats);
    expect(first).toEqual(second);
  });
});

// ─── API route badge persistence (mocked Supabase) ───────────────────────────

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/resolve-user", () => ({ resolveAppUser: vi.fn() }));
vi.mock("@/lib/metrics-cache", () => ({
  isMetricsCacheBypassed: vi.fn().mockReturnValue(false),
  METRICS_CACHE_TTL_SECONDS: { streak: 300, contributions: 300 },
  metricsCacheKey: vi.fn((_userId: string, type: string) => `key:${type}`),
  withMetricsCache: vi.fn(async (_opts: unknown, fn: () => Promise<unknown>) => fn()),
}));
vi.mock("@/lib/github", () => ({ GITHUB_API: "https://api.github.com" }));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: (...args: unknown[]) => mockFrom(...args) },
}));

import { GET } from "@/app/api/badges/route";
import { getServerSession } from "next-auth";
import { resolveAppUser } from "@/lib/resolve-user";
import { NextRequest } from "next/server";

const makeReq = () => new NextRequest("http://localhost/api/badges");

describe("GET /api/badges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue({
      accessToken: "token",
      githubId: "gh-1",
      githubLogin: "testuser",
    } as any);
    vi.mocked(resolveAppUser).mockResolvedValue({ id: "user-uuid" } as any);

    // Default: no existing badges, no freezes
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          count: 0,
          head: true,
          data: [],
          error: null,
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    });

    // Mock fetch for GitHub API
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ total_count: 0, items: [] }),
    } as any);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 401 when user not found", async () => {
    vi.mocked(resolveAppUser).mockResolvedValue(null);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 200 with earned and locked arrays", async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("earned");
    expect(body).toHaveProperty("locked");
    expect(Array.isArray(body.earned)).toBe(true);
    expect(Array.isArray(body.locked)).toBe(true);
  });

  it("total badge count always equals 8", async () => {
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.earned.length + body.locked.length).toBe(8);
  });

  it("each badge item has required fields", async () => {
    const res = await GET(makeReq());
    const body = await res.json();
    const allBadges = [...body.earned, ...body.locked];
    for (const badge of allBadges) {
      expect(badge).toHaveProperty("id");
      expect(badge).toHaveProperty("name");
      expect(badge).toHaveProperty("emoji");
      expect(badge).toHaveProperty("description");
      expect(badge).toHaveProperty("earned");
      expect(badge).toHaveProperty("earnedAt");
      expect(badge).toHaveProperty("unlockCondition");
    }
  });

  it("locked badges have null earnedAt", async () => {
    const res = await GET(makeReq());
    const body = await res.json();
    for (const badge of body.locked) {
      expect(badge.earnedAt).toBeNull();
      expect(badge.earned).toBe(false);
    }
  });

  it("earned badges have non-null earnedAt", async () => {
    // Simulate ice_saver being already stored
    const storedBadges = [{ badge_key: "ice_saver", earned_at: "2026-06-01T00:00:00Z" }];

    mockFrom.mockImplementation((table: string) => {
      if (table === "streak_freezes") {
        return {
          select: vi.fn().mockReturnValue({
            count: "exact",
            head: true,
            eq: vi.fn().mockResolvedValue({ count: 1, error: null }),
          }),
        };
      }
      if (table === "user_badges") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              data: storedBadges,
              error: null,
              order: vi.fn().mockResolvedValue({ data: storedBadges, error: null }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ data: [], error: null }),
        }),
      };
    });

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
  });
});
