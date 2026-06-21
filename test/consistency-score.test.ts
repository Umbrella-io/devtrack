import { describe, it, expect } from "vitest";
import { isRecentlyActiveFromScore } from "../src/lib/consistency-score";
import type { ConsistencyScoreResult } from "../src/lib/consistency-score";

function makeScore(overrides: Partial<ConsistencyScoreResult> = {}): ConsistencyScoreResult {
  return {
    score: 75,
    grade: "A",
    weeklyConsistency: 80,
    monthlyTrend: [],
    longestGap: 0,
    avgDailyCommits: 1,
    streakQuality: 0.5,
    improvementTip: "Good consistency!",
    ...overrides,
  };
}

describe("isRecentlyActiveFromScore", () => {
  it("returns true when score is 100 and longestGap is 0", () => {
    // baseline = min(100, 0.8*40 + 0.5*30 + 20) = min(100, 32+15+20) = 67
    // recent = 100 - 67 = 33 >= 10 → true
    const data = makeScore({ score: 100, longestGap: 0, streakQuality: 0.5, weeklyConsistency: 80 });
    expect(isRecentlyActiveFromScore(data)).toBe(true);
  });

  it("returns true when score is high and longestGap is small", () => {
    // baseline = 0.9*40 + 0.4*30 + (20-1) = 36+12+19 = 67
    // recent = 88 - 67 = 21 >= 10 → true
    const data = makeScore({ score: 88, longestGap: 7, streakQuality: 0.4, weeklyConsistency: 90 });
    expect(isRecentlyActiveFromScore(data)).toBe(true);
  });

  it("returns true at exactly the threshold (score - baseline = 10)", () => {
    // Find values where score - baseline = 10
    // baseline = 0.8*40 + 0.5*30 + 20 = 32+15+20 = 67
    // score = 77 → recent = 77-67 = 10 ≥ 10 → true
    const data = makeScore({ score: 77, longestGap: 0, streakQuality: 0.5, weeklyConsistency: 80 });
    expect(isRecentlyActiveFromScore(data)).toBe(true);
  });

  it("returns false when score - baseline < 10", () => {
    // baseline = 0.8*40 + 0.5*30 + 20 = 67
    // score = 75 → recent = 75-67 = 8 < 10 → false
    const data = makeScore({ score: 75, longestGap: 0, streakQuality: 0.5, weeklyConsistency: 80 });
    expect(isRecentlyActiveFromScore(data)).toBe(false);
  });

  it("returns false when score is exactly at baseline", () => {
    // score = baseline → recent = 0 < 10 → false
    // Set score = baseline = 0.8*40 + 0.5*30 + 20 = 67
    // streakQuality = 0.5, longestGap = 0
    const data = makeScore({ score: 67, longestGap: 0, streakQuality: 0.5, weeklyConsistency: 80 });
    expect(isRecentlyActiveFromScore(data)).toBe(false);
  });

  it("returns false for a low score (no room for recent activity)", () => {
    // baseline calculation with small values
    // baseline = 0.4*40 + 0.2*30 + 10 = 16+6+10 = 32
    // score = 35 → recent = 35-32 = 3 < 10 → false
    const data = makeScore({ score: 35, longestGap: 70, streakQuality: 0.2, weeklyConsistency: 40 });
    expect(isRecentlyActiveFromScore(data)).toBe(false);
  });

  it("returns true when streak and consistency are both high (recent >= 10)", () => {
    // baseline = min(100, 1*40 + 1*30 + 20) = min(100, 90) = 90
    // recent = 100 - 90 = 10 >= 10 -> true
    const data = makeScore({ score: 100, longestGap: 0, streakQuality: 1, weeklyConsistency: 100 });
    expect(isRecentlyActiveFromScore(data)).toBe(true);
  });

  it("returns true when weeklyConsistency is high enough", () => {
    // baseline = 0.9*40 + 0.3*30 + 19 = 36+9+19 = 64
    // score = 75 → recent = 75-64 = 11 >= 10 → true
    const data = makeScore({ score: 75, longestGap: 7, streakQuality: 0.3, weeklyConsistency: 90 });
    expect(isRecentlyActiveFromScore(data)).toBe(true);
  });

  it("handles boundary gap values", () => {
    // longestGap = 0 → gapPoints = 20
    // longestGap = 7 → gapPoints = 19
    // longestGap = 140 → gapPoints = 0 (clamped)
    const data7 = makeScore({ score: 73, longestGap: 7, weeklyConsistency: 80, streakQuality: 0.5 });
    const data0 = makeScore({ score: 72, longestGap: 0, weeklyConsistency: 80, streakQuality: 0.5 });
    // baseline7 = 0.8*40 + 0.5*30 + 19 = 32+15+19 = 66
    // recent7 = 73-66 = 7 < 10 → false
    expect(isRecentlyActiveFromScore(data7)).toBe(false);
    // baseline0 = 32+15+20 = 67
    // recent0 = 72-67 = 5 < 10 → false
    expect(isRecentlyActiveFromScore(data0)).toBe(false);
  });

  it("uses correct monthlyTrend and avgDailyCommists (not used in calculation)", () => {
    // isRecentlyActiveFromScore does not use monthlyTrend or avgDailyCommits
    // The function only uses: score, weeklyConsistency, streakQuality, longestGap
    const data = makeScore({ monthlyTrend: [], avgDailyCommits: 0 });
    // baseline = 0.8*40 + 0.5*30 + 20 = 67, score=75 → recent=8 < 10
    expect(isRecentlyActiveFromScore(data)).toBe(false);
  });
});
