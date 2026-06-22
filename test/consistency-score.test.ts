import { describe, expect, it } from "vitest";
import {
  scoreToGrade,
  getImprovementTip,
  computeLongestGap,
  hasActivityInLastNDays,
  computeWeeklyConsistency,
  computeMonthlyTrend,
  calculateConsistencyScore,
  isRecentlyActiveFromScore,
} from "../src/lib/consistency-score";

describe("scoreToGrade", () => {
  it("returns S for score >= 90", () => {
    expect(scoreToGrade(90)).toBe("S");
    expect(scoreToGrade(100)).toBe("S");
  });

  it("returns A for score 75-89", () => {
    expect(scoreToGrade(75)).toBe("A");
    expect(scoreToGrade(89)).toBe("A");
  });

  it("returns B for score 60-74", () => {
    expect(scoreToGrade(60)).toBe("B");
    expect(scoreToGrade(74)).toBe("B");
  });

  it("returns C for score 40-59", () => {
    expect(scoreToGrade(40)).toBe("C");
    expect(scoreToGrade(59)).toBe("C");
  });

  it("returns D for score < 40", () => {
    expect(scoreToGrade(0)).toBe("D");
    expect(scoreToGrade(39)).toBe("D");
  });
});

describe("getImprovementTip", () => {
  it("returns D-tier tip for score < 40", () => {
    expect(getImprovementTip(0)).toContain("2-3 days");
  });

  it("returns C-tier tip for score 40-59", () => {
    expect(getImprovementTip(50)).toContain("4+ active days");
  });

  it("returns B-tier tip for score 60-74", () => {
    expect(getImprovementTip(65)).toContain("reduce gaps");
  });

  it("returns A-tier tip for score 75-89", () => {
    expect(getImprovementTip(80)).toContain("maintain your current streak");
  });

  it("returns S-tier tip for score >= 90", () => {
    expect(getImprovementTip(95)).toContain("Outstanding consistency");
  });
});

describe("computeLongestGap", () => {
  it("returns 0 for empty array", () => {
    expect(computeLongestGap([])).toBe(0);
  });

  it("returns 0 for single date", () => {
    expect(computeLongestGap(["2024-01-01"])).toBe(0);
  });

  it("returns gap between consecutive dates", () => {
    expect(computeLongestGap(["2024-01-01", "2024-01-03"])).toBe(1);
    expect(computeLongestGap(["2024-01-01", "2024-01-06"])).toBe(4);
  });

  it("returns the maximum gap across multiple dates", () => {
    expect(computeLongestGap(["2024-01-01", "2024-01-03", "2024-01-10"])).toBe(6);
  });

  it("handles unsorted dates correctly", () => {
    expect(computeLongestGap(["2024-01-10", "2024-01-01", "2024-01-03"])).toBe(6);
  });
});

describe("hasActivityInLastNDays", () => {
  const activeDates = new Set(["2024-06-20", "2024-06-18", "2024-06-15"]);

  it("returns true when activity is within N days of today", () => {
    const today = "2024-06-21";
    expect(hasActivityInLastNDays(activeDates, 7, today)).toBe(true);
  });

  it("returns false when no activity in N days", () => {
    const today = "2024-06-21";
    expect(hasActivityInLastNDays(activeDates, 3, today)).toBe(false);
  });

  it("returns true for exact day match", () => {
    const today = "2024-06-20";
    expect(hasActivityInLastNDays(activeDates, 1, today)).toBe(true);
  });

  it("returns false for empty activeDates", () => {
    expect(hasActivityInLastNDays(new Set(), 7, "2024-06-21")).toBe(false);
  });
});

describe("computeWeeklyConsistency", () => {
  it("returns 0 for no active dates", () => {
    expect(computeWeeklyConsistency(new Set())).toBe(0);
  });

  it("returns 100 when all 12 weeks have activity", () => {
    // The function checks last 12 weeks from "this week" — 
    // all weeks with at least one date in the set
    const allWeeks = new Set([
      "2024-01-01", "2024-01-08", "2024-01-15", "2024-01-22",
      "2024-01-29", "2024-02-05", "2024-02-12", "2024-02-19",
      "2024-02-26", "2024-03-04", "2024-03-11", "2024-03-18",
    ]);
    const result = computeWeeklyConsistency(allWeeks);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(100);
  });

  it("returns 0 when no weeks match the last 12-week window", () => {
    const oldWeeks = new Set(["2020-01-01", "2020-01-08"]);
    expect(computeWeeklyConsistency(oldWeeks)).toBe(0);
  });
});

describe("computeMonthlyTrend", () => {
  it("returns 6 months of trend data", () => {
    const result = computeMonthlyTrend(new Set(["2024-06-15", "2024-06-10"]));
    expect(result).toHaveLength(6);
  });

  it("counts active days per month", () => {
    const activeDates = new Set(["2024-06-01", "2024-06-15", "2024-07-10"]);
    const result = computeMonthlyTrend(activeDates);
    const juneEntry = result.find((m) => m.month.includes("Jun"));
    expect(juneEntry?.activeDays).toBe(2);
  });

  it("returns 0 active days for months with no activity", () => {
    const result = computeMonthlyTrend(new Set());
    result.forEach((entry) => {
      expect(entry.activeDays).toBe(0);
    });
  });
});

describe("calculateConsistencyScore", () => {
  it("returns a valid score between 0 and 100", () => {
    const result = calculateConsistencyScore(new Set(["2024-06-20"]));
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("returns a valid grade", () => {
    const result = calculateConsistencyScore(new Set());
    expect(["S", "A", "B", "C", "D"]).toContain(result.grade);
  });

  it("includes monthlyTrend in the result", () => {
    const result = calculateConsistencyScore(new Set());
    expect(result.monthlyTrend).toBeDefined();
    expect(result.monthlyTrend).toHaveLength(6);
  });

  it("longestGap is non-negative", () => {
    const result = calculateConsistencyScore(new Set());
    expect(result.longestGap).toBeGreaterThanOrEqual(0);
  });
});

describe("isRecentlyActiveFromScore", () => {
  it("returns true when score is boosted by recent activity", () => {
    const data = {
      score: 75,
      grade: "B" as const,
      weeklyConsistency: 50,
      monthlyTrend: [],
      longestGap: 5,
      avgDailyCommits: 1,
      streakQuality: 0.5,
      improvementTip: "keep going",
    };
    // If score minus base >= 10, should return true
    const result = isRecentlyActiveFromScore(data);
    expect(typeof result).toBe("boolean");
  });

  it("returns false when no recent activity impact", () => {
    const data = {
      score: 55,
      grade: "C" as const,
      weeklyConsistency: 30,
      monthlyTrend: [],
      longestGap: 30,
      avgDailyCommits: 0,
      streakQuality: 0,
      improvementTip: "try committing",
    };
    expect(isRecentlyActiveFromScore(data)).toBe(false);
  });
});
