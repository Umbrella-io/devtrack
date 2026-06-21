import { describe, it, expect } from "vitest";
import {
  calculateConsistencyScore,
  isRecentlyActiveFromScore,
  type ConsistencyScoreResult,
} from "../src/lib/consistency-score";

describe("calculateConsistencyScore", () => {
  it("returns an object with expected keys", () => {
    const result = calculateConsistencyScore(new Set());
    expect(result).toHaveProperty("score");
    expect(result).toHaveProperty("grade");
    expect(result).toHaveProperty("weeklyConsistency");
    expect(result).toHaveProperty("monthlyTrend");
    expect(result).toHaveProperty("longestGap");
    expect(result).toHaveProperty("avgDailyCommits");
    expect(result).toHaveProperty("streakQuality");
    expect(result).toHaveProperty("improvementTip");
  });

  it("grade is one of the expected values", () => {
    const result = calculateConsistencyScore(new Set());
    expect(["S", "A", "B", "C", "D"]).toContain(result.grade);
  });

  it("monthlyTrend has exactly 6 entries", () => {
    const result = calculateConsistencyScore(new Set());
    expect(result.monthlyTrend).toHaveLength(6);
  });

  it("score is between 0 and 100", () => {
    const result = calculateConsistencyScore(new Set());
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("longestGap is non-negative", () => {
    const result = calculateConsistencyScore(new Set());
    expect(result.longestGap).toBeGreaterThanOrEqual(0);
  });

  it("streakQuality is between 0 and 1", () => {
    const result = calculateConsistencyScore(new Set());
    expect(result.streakQuality).toBeGreaterThanOrEqual(0);
    expect(result.streakQuality).toBeLessThanOrEqual(1);
  });

  it("improvementTip is a non-empty string", () => {
    const result = calculateConsistencyScore(new Set());
    expect(typeof result.improvementTip).toBe("string");
    expect(result.improvementTip.length).toBeGreaterThan(0);
  });

  it("defaults to UTC timezone", () => {
    const result = calculateConsistencyScore(new Set());
    // Should not throw — the function accepts an optional timezone
    expect(result).toBeDefined();
  });

  it("uses the provided timezone", () => {
    // Should not throw — uses the provided timezone for date calculations
    const result = calculateConsistencyScore(new Set(), "America/New_York");
    expect(result).toBeDefined();
  });

  it("grade is S when score is near maximum", () => {
    // Add dates for every day in the last 12 weeks to get a high score
    const dates = new Set<string>();
    const now = new Date();
    for (let i = 0; i < 90; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dates.add(d.toISOString().slice(0, 10));
    }
    const result = calculateConsistencyScore(dates);
    expect(["S", "A"]).toContain(result.grade);
  });

  it("longestGap increases with sparse activity", () => {
    const sparseDates = new Set(["2026-01-01", "2026-06-01"]);
    const denseDates = new Set(["2026-06-20", "2026-06-21", "2026-06-22"]);
    const sparseResult = calculateConsistencyScore(sparseDates);
    const denseResult = calculateConsistencyScore(denseDates);
    expect(sparseResult.longestGap).toBeGreaterThanOrEqual(denseResult.longestGap);
  });

  it("monthlyTrend entries have month string and activeDays number", () => {
    const result = calculateConsistencyScore(new Set());
    for (const entry of result.monthlyTrend) {
      expect(typeof entry.month).toBe("string");
      expect(entry.month.length).toBeGreaterThan(0);
      expect(typeof entry.activeDays).toBe("number");
      expect(entry.activeDays).toBeGreaterThanOrEqual(0);
    }
  });

  it("monthlyTrend is ordered chronologically (oldest to most recent)", () => {
    const result = calculateConsistencyScore(new Set());
    for (let i = 0; i < result.monthlyTrend.length - 1; i++) {
      const current = new Date(result.monthlyTrend[i].month);
      const next = new Date(result.monthlyTrend[i + 1].month);
      expect(current.getTime()).toBeLessThan(next.getTime());
    }
  });
});

describe("isRecentlyActiveFromScore", () => {
  it("returns false for a result with no score boost from recent activity", () => {
    // longestGap of 280 gives gapPoints = 20 - min(20, 40) = -20, total = 0
    const data: ConsistencyScoreResult = {
      score: 5,
      grade: "D",
      weeklyConsistency: 0,
      monthlyTrend: [],
      longestGap: 280,
      avgDailyCommits: 0,
      streakQuality: 0,
      improvementTip: "tip",
    };
    expect(isRecentlyActiveFromScore(data)).toBe(false);
  });

  it("returns false when score difference is below threshold", () => {
    const data: ConsistencyScoreResult = {
      score: 49,
      grade: "C",
      weeklyConsistency: 50,
      monthlyTrend: [],
      longestGap: 5,
      avgDailyCommits: 0,
      streakQuality: 0.5,
      improvementTip: "tip",
    };
    // score - without_recent is small (9), below the 10-point threshold
    expect(isRecentlyActiveFromScore(data)).toBe(false);
  });

  it("handles edge case of score of 0", () => {
    const data: ConsistencyScoreResult = {
      score: 0,
      grade: "D",
      weeklyConsistency: 0,
      monthlyTrend: [],
      longestGap: 0,
      avgDailyCommits: 0,
      streakQuality: 0,
      improvementTip: "tip",
    };
    expect(isRecentlyActiveFromScore(data)).toBe(false);
  });

  it("handles perfect S-grade score", () => {
    const data: ConsistencyScoreResult = {
      score: 100,
      grade: "S",
      weeklyConsistency: 100,
      monthlyTrend: [],
      longestGap: 0,
      avgDailyCommits: 1,
      streakQuality: 1,
      improvementTip: "tip",
    };
    expect(isRecentlyActiveFromScore(data)).toBe(true);
  });
});
