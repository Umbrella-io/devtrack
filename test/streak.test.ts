import { describe, expect, it } from "vitest";
import {
  calculateStreakFromDates,
  isStreakAtRisk,
  toContributionDate,
} from "@/lib/streak";

describe("streak calculations", () => {
  const today = new Date("2026-05-25T12:00:00.000Z");

  it("returns 0 for empty commit history", () => {
    const result = calculateStreakFromDates([], undefined, today);

    expect(result).toEqual({
      current: 0,
      longest: 0,
      lastCommitDate: null,
      totalActiveDays: 0,
      freezeDates: [],
    });
  });

  it("counts consecutive days correctly", () => {
    const result = calculateStreakFromDates(
      ["2026-05-22", "2026-05-23", "2026-05-24", "2026-05-25"],
      [],
      today
    );

    expect(result.current).toBe(4);
    expect(result.longest).toBe(4);
  });

  it("resets streak on missed day", () => {
    const result = calculateStreakFromDates(
      ["2026-05-20", "2026-05-21", "2026-05-23", "2026-05-25"],
      [],
      today
    );
    const staleResult = calculateStreakFromDates(
      ["2026-05-20", "2026-05-21"],
      [],
      today
    );

    expect(result.current).toBe(1);
    expect(result.longest).toBe(2);
    expect(staleResult.current).toBe(0);
  });

  it("handles streak freeze correctly when frozen day would otherwise break streak", () => {
    const result = calculateStreakFromDates(
      ["2026-05-22", "2026-05-23", "2026-05-25"],
      ["2026-05-24"],
      today
    );

    expect(result.current).toBe(4);
    expect(result.longest).toBe(4);
    expect(result.freezeDates).toEqual(["2026-05-24"]);
  });

  it("calculates longest streak from history", () => {
    const result = calculateStreakFromDates(
      [
        "2026-05-01",
        "2026-05-02",
        "2026-05-04",
        "2026-05-05",
        "2026-05-06",
        "2026-05-25",
      ],
      [],
      today
    );

    expect(result.current).toBe(1);
    expect(result.longest).toBe(3);
  });

  it("detects streak at risk when there is no commit today", () => {
    const streak = calculateStreakFromDates(["2026-05-23", "2026-05-24"], [], today);

    expect(streak.current).toBe(2);
    expect(isStreakAtRisk(streak, { now: today })).toBe(true);
    expect(isStreakAtRisk({ current: 0, lastCommitDate: null }, { now: today })).toBe(false);
    expect(isStreakAtRisk({ current: 1, lastCommitDate: "2026-05-25" }, { now: today })).toBe(false);
    expect(isStreakAtRisk(streak, { now: today, hasStreakFreeze: true })).toBe(false);
  });

  it("handles timezone boundaries correctly", () => {
    expect(toContributionDate(new Date("2026-05-25T00:30:00.000Z"))).toBe("2026-05-25");
    expect(toContributionDate("2026-05-25T00:30:00+05:30")).toBe("2026-05-25");
    expect(toContributionDate("2026-05-24T23:30:00-07:00")).toBe("2026-05-24");
    expect(toContributionDate("May 25, 2026 00:30:00 UTC")).toBe("2026-05-25");
  });

  it("counts today correctly if commit made after midnight", () => {
    const result = calculateStreakFromDates(
      ["2026-05-24", "2026-05-25T00:05:00+05:30"],
      [],
      today
    );

    expect(result.current).toBe(2);
    expect(result.lastCommitDate).toBe("2026-05-25");
  });

  it("handles leap year Feb 29 correctly", () => {
    const result = calculateStreakFromDates(
      ["2024-02-28", "2024-02-29", "2024-03-01"],
      [],
      new Date("2024-03-01T12:00:00.000Z")
    );

    expect(result.current).toBe(3);
    expect(result.longest).toBe(3);
  });

  it("handles months with 28, 29, 30, and 31 days", () => {
    const result = calculateStreakFromDates(
      [
        "2023-02-28",
        "2023-03-01",
        "2024-02-28",
        "2024-02-29",
        "2024-03-01",
        "2026-04-30",
        "2026-05-01",
        "2026-05-24",
        "2026-05-25",
      ],
      [],
      today
    );

    expect(result.current).toBe(2);
    expect(result.longest).toBe(3);
  });
});
