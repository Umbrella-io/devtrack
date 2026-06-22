import {
  scoreToGrade,
  getImprovementTip,
  isRecentlyActiveFromScore,
  calculateConsistencyScore,
  computeWeeklyConsistency,
  computeMonthlyTrend,
  computeLongestGap,
  ConsistencyScoreResult
} from "../src/lib/consistency-score";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("consistency-score utility functions", () => {
  describe("scoreToGrade", () => {
    it("should return S for scores >= 90", () => {
      expect(scoreToGrade(90)).toBe("S");
      expect(scoreToGrade(100)).toBe("S");
    });

    it("should return A for scores >= 75 and < 90", () => {
      expect(scoreToGrade(75)).toBe("A");
      expect(scoreToGrade(89)).toBe("A");
    });

    it("should return B for scores >= 60 and < 75", () => {
      expect(scoreToGrade(60)).toBe("B");
      expect(scoreToGrade(74)).toBe("B");
    });

    it("should return C for scores >= 40 and < 60", () => {
      expect(scoreToGrade(40)).toBe("C");
      expect(scoreToGrade(59)).toBe("C");
    });

    it("should return D for scores < 40", () => {
      expect(scoreToGrade(39)).toBe("D");
      expect(scoreToGrade(0)).toBe("D");
      expect(scoreToGrade(-10)).toBe("D");
    });
  });

  describe("getImprovementTip", () => {
    it("should return correct tip for scores < 40", () => {
      expect(getImprovementTip(39)).toBe("Try committing at least once every 2-3 days to build consistency");
    });

    it("should return correct tip for scores >= 40 and < 60", () => {
      expect(getImprovementTip(40)).toBe("You are making progress! Aim for 4+ active days per week");
      expect(getImprovementTip(59)).toBe("You are making progress! Aim for 4+ active days per week");
    });

    it("should return correct tip for scores >= 60 and < 75", () => {
      expect(getImprovementTip(60)).toBe("Good consistency! Try to reduce gaps between coding sessions");
      expect(getImprovementTip(74)).toBe("Good consistency! Try to reduce gaps between coding sessions");
    });

    it("should return correct tip for scores >= 75 and < 90", () => {
      expect(getImprovementTip(75)).toBe("Great work! Maintain your current streak to reach S tier");
      expect(getImprovementTip(89)).toBe("Great work! Maintain your current streak to reach S tier");
    });

    it("should return correct tip for scores >= 90", () => {
      expect(getImprovementTip(90)).toBe("Outstanding consistency! You are in the top tier of developers");
      expect(getImprovementTip(100)).toBe("Outstanding consistency! You are in the top tier of developers");
    });
  });

  describe("isRecentlyActiveFromScore", () => {
    const createBaseData = (
      score: number,
      weeklyConsistency: number,
      streakQuality: number,
      longestGap: number
    ): ConsistencyScoreResult => ({
      score,
      grade: "A",
      weeklyConsistency,
      monthlyTrend: [],
      longestGap,
      avgDailyCommits: 1,
      streakQuality,
      improvementTip: "tip"
    });

    it("should return true when recent activity bonus is >= 10 points", () => {
      const data = createBaseData(100, 100, 1.0, 0);
      expect(isRecentlyActiveFromScore(data)).toBe(true);
    });

    it("should return false when recent activity bonus is < 10 points", () => {
      const data = createBaseData(58, 50, 0.5, 14);
      expect(isRecentlyActiveFromScore(data)).toBe(false);
    });

    it("should correctly handle boundaries", () => {
      const data1 = createBaseData(60, 50, 0.5, 35); 
      expect(isRecentlyActiveFromScore(data1)).toBe(true);

      const data2 = createBaseData(59, 50, 0.5, 35);
      expect(isRecentlyActiveFromScore(data2)).toBe(false);
    });
  });

  describe("calculateConsistencyScore", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      // Set fixed date: October 20th, 2023.
      vi.setSystemTime(new Date("2023-10-20T12:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should handle an empty set", () => {
      const result = calculateConsistencyScore(new Set());
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(["S", "A", "B", "C", "D"]).toContain(result.grade);
      expect(result.monthlyTrend).toHaveLength(6);
      expect(result.longestGap).toBe(0);
    });

    it("should handle a single date", () => {
      const result = calculateConsistencyScore(new Set(["2023-10-18"]));
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(["S", "A", "B", "C", "D"]).toContain(result.grade);
      expect(result.monthlyTrend).toHaveLength(6);
      expect(result.longestGap).toBe(0);
    });

    it("should handle multiple dates in one week (gap-free)", () => {
      const result = calculateConsistencyScore(new Set([
        "2023-10-16",
        "2023-10-17",
        "2023-10-18",
        "2023-10-19",
        "2023-10-20",
      ]));
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(["S", "A", "B", "C", "D"]).toContain(result.grade);
      expect(result.monthlyTrend).toHaveLength(6);
      // gap-free should have 0 gap
      expect(result.longestGap).toBe(0);
    });

    it("should handle multiple dates spanning weeks and months (gapful)", () => {
      const result = calculateConsistencyScore(new Set([
        "2023-08-01",
        "2023-09-15",
        "2023-10-01",
        "2023-10-18",
      ]));
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(["S", "A", "B", "C", "D"]).toContain(result.grade);
      expect(result.monthlyTrend).toHaveLength(6);
      
      // The largest gap is between 2023-08-01 and 2023-09-15.
      // August 1st to August 31st = 30 days
      // August 31st to September 15th = 15 days
      // Total diff = 45 days.
      // Gap is diff - 1 = 44 days.
      expect(result.longestGap).toBe(44);
    });
  });

  describe("computeWeeklyConsistency", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2023-10-20T12:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should return 0 for empty dates", () => {
      expect(computeWeeklyConsistency(new Set())).toBe(0);
    });

    it("should correctly compute percentage for dates within the last 12 weeks", () => {
      // 12 weeks total. Each week with activity = 1 / 12 = ~8.33%
      // 2 weeks = 16.66% -> Math.round -> 17
      const dates = new Set([
        "2023-10-18", // this week
        "2023-10-10", // last week
      ]);
      expect(computeWeeklyConsistency(dates)).toBe(17);
      
      // All 12 weeks
      const fullDates = new Set<string>();
      for (let i = 0; i < 12; i++) {
        const d = new Date("2023-10-20T12:00:00Z");
        d.setDate(d.getDate() - i * 7);
        fullDates.add(d.toISOString().split("T")[0]);
      }
      expect(computeWeeklyConsistency(fullDates)).toBe(100);
    });
  });

  describe("computeMonthlyTrend", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2023-10-20T12:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should return correct month labels and trend data", () => {
      const dates = new Set([
        "2023-10-18",
        "2023-10-19",
        "2023-09-15",
        "2023-08-01",
      ]);
      
      const trend = computeMonthlyTrend(dates);
      expect(trend).toHaveLength(6);
      
      // Sorted oldest to newest
      // Oct is index 5
      expect(trend[5].month).toBe("Oct 2023");
      expect(trend[5].activeDays).toBe(2);
      
      // Sept is index 4
      expect(trend[4].month).toBe("Sep 2023");
      expect(trend[4].activeDays).toBe(1);
      
      // Aug is index 3
      expect(trend[3].month).toBe("Aug 2023");
      expect(trend[3].activeDays).toBe(1);
      
      // July is index 2
      expect(trend[2].month).toBe("Jul 2023");
      expect(trend[2].activeDays).toBe(0);
    });
  });

  describe("computeLongestGap", () => {
    it("should return 0 for fewer than 2 dates", () => {
      expect(computeLongestGap([])).toBe(0);
      expect(computeLongestGap(["2023-10-20"])).toBe(0);
    });

    it("should compute gaps for continuous dates", () => {
      expect(computeLongestGap(["2023-10-18", "2023-10-19", "2023-10-20"])).toBe(0);
    });

    it("should compute gap correctly", () => {
      expect(computeLongestGap(["2023-10-18", "2023-10-20"])).toBe(1); // 19th is missing
      expect(computeLongestGap(["2023-01-01", "2023-01-11"])).toBe(9); 
    });
  });
});
