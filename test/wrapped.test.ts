import { describe, expect, it } from "vitest";
import {
  calculateLanguagePercentages,
  calculateLongestStreak,
  getMostContributedRepo,
  getMostProductiveMonth,
  getPeakCodingHour,
  getYearRange,
} from "@/lib/wrapped";

describe("wrapped helpers", () => {
  it("calculates the longest contribution streak", () => {
    expect(
      calculateLongestStreak({
        "2025-01-01": 2,
        "2025-01-02": 1,
        "2025-01-04": 4,
        "2025-01-05": 1,
        "2025-01-06": 1,
      })
    ).toBe(3);
  });

  it("finds the most productive month", () => {
    expect(
      getMostProductiveMonth({
        "2025-02-01": 3,
        "2025-02-03": 2,
        "2025-07-10": 8,
      })
    ).toEqual({ name: "July", commits: 8 });
  });

  it("finds the most contributed repository", () => {
    expect(
      getMostContributedRepo([
        { date: "2025-01-01", repo: "open/devtrack" },
        { date: "2025-01-02", repo: "open/devtrack" },
        { date: "2025-01-03", repo: "open/docs" },
      ])
    ).toEqual({ name: "open/devtrack", commits: 2 });
  });

  it("formats the peak coding hour", () => {
    expect(getPeakCodingHour([0, 13, 13, 23])).toEqual({
      hour: 13,
      label: "1pm",
      commits: 2,
    });
  });

  it("calculates top language percentages", () => {
    expect(
      calculateLanguagePercentages({
        TypeScript: 300,
        Python: 100,
        CSS: 100,
        HTML: 50,
      })
    ).toEqual([
      { name: "TypeScript", bytes: 300, percentage: 54.5 },
      { name: "Python", bytes: 100, percentage: 18.2 },
      { name: "CSS", bytes: 100, percentage: 18.2 },
    ]);
  });

  it("returns empty array when total bytes is zero", () => {
    expect(calculateLanguagePercentages({})).toEqual([]);
  });

  it("respects the limit parameter", () => {
    expect(
      calculateLanguagePercentages(
        {
          TypeScript: 300,
          Python: 100,
          CSS: 100,
          HTML: 50,
        },
        2
      )
    ).toEqual([
      { name: "TypeScript", bytes: 300, percentage: 54.5 },
      { name: "Python", bytes: 100, percentage: 18.2 },
    ]);
  });

  it("handles single language as 100 percent", () => {
    expect(
      calculateLanguagePercentages({
        JavaScript: 500,
      })
    ).toEqual([{ name: "JavaScript", bytes: 500, percentage: 100 }]);
  });

  it("marks future year ranges as partial", () => {
    expect(getYearRange(2026, new Date("2026-05-25T00:00:00Z"))).toMatchObject({
      startDate: "2026-01-01",
      endDate: "2026-05-25",
      partial: true,
    });
  });
});
