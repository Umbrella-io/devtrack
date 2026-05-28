import { describe, it, expect } from "vitest";
import { pruneExpiredLeaderboardCache, pruneExpiredRateLimits } from "../src/lib/leaderboard-cache";

describe("pruneExpiredRateLimits", () => {
  it("removes only expired IP buckets", () => {
    const buckets = new Map([
      ["expired", { count: 20, resetAt: 1_000 }],
      ["active", { count: 2, resetAt: 5_000 }],
    ]);

    pruneExpiredRateLimits(buckets, 2_000);

    expect(buckets.has("expired")).toBe(false);
    expect(buckets.get("active")).toEqual({ count: 2, resetAt: 5_000 });
  });
});

describe("pruneExpiredLeaderboardCache", () => {
  it("clears stale leaderboard payloads", () => {
    const cache = {
      expiresAt: 1_000,
      payload: { ok: true },
    };

    expect(pruneExpiredLeaderboardCache(cache, 1_001)).toBe(null);
  });

  it("keeps fresh leaderboard payloads", () => {
    const cache = {
      expiresAt: 2_000,
      payload: { ok: true },
    };

    expect(pruneExpiredLeaderboardCache(cache, 1_999)).toBe(cache);
  });

  it("expires entry exactly at boundary timestamp", () => {
    const cache = {
      expiresAt: 1_000,
      payload: { data: "test" },
    };

    expect(pruneExpiredLeaderboardCache(cache, 1_000)).toBe(null);
  });

  it("handles entry expiring 1ms before current", () => {
    const cache = {
      expiresAt: 999,
      payload: { data: "almost-expired" },
    };

    expect(pruneExpiredLeaderboardCache(cache, 1_000)).toBe(null);
  });

  it("handles null entry", () => {
    expect(pruneExpiredLeaderboardCache(null)).toBe(null);
    expect(pruneExpiredLeaderboardCache(null, 500)).toBe(null);
  });

  it("keeps entry with far future expiry", () => {
    const now = Date.now();
    const cache = {
      expiresAt: now + 86400000,
      payload: { data: "future" },
    };

    expect(pruneExpiredLeaderboardCache(cache, now)).toEqual(cache);
  });

  it("works with different generic types", () => {
    const now = Date.now();
    const stringCache = {
      expiresAt: now + 1000,
      payload: "string data",
    };
    expect(pruneExpiredLeaderboardCache(stringCache, now)).toBe(stringCache);

    const numberCache = {
      expiresAt: now + 1000,
      payload: 42,
    };
    expect(pruneExpiredLeaderboardCache(numberCache, now)).toBe(numberCache);

    const arrayCache = {
      expiresAt: now + 1000,
      payload: [1, 2, 3],
    };
    expect(pruneExpiredLeaderboardCache(arrayCache, now)).toEqual(arrayCache);
  });
});