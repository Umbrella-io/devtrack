import { describe, it, expect } from "vitest";
import { toDateStr, getThisWeekRange, getLastWeekRange } from "../src/lib/dateUtils";

describe("toDateStr", () => {
  it("converts a date to YYYY-MM-DD format", () => {
    const date = new Date("2024-03-15T10:30:00Z");
    expect(toDateStr(date)).toBe("2024-03-15");
  });

  it("handles date with single digit month and day", () => {
    const date = new Date("2024-01-05T00:00:00Z");
    expect(toDateStr(date)).toBe("2024-01-05");
  });
});

describe("getThisWeekRange", () => {
  it("returns an object with start and end ISO strings", () => {
    const result = getThisWeekRange();
    expect(result).toHaveProperty("start");
    expect(result).toHaveProperty("end");
  });

  it("start is before end", () => {
    const result = getThisWeekRange();
    expect(new Date(result.start).getTime()).toBeLessThan(new Date(result.end).getTime());
  });
});

describe("getLastWeekRange", () => {
  it("returns an object with start and end ISO strings", () => {
    const result = getLastWeekRange();
    expect(result).toHaveProperty("start");
    expect(result).toHaveProperty("end");
  });

  it("returns a range that is before this week", () => {
    const lastWeek = getLastWeekRange();
    const thisWeek = getThisWeekRange();
    expect(new Date(lastWeek.end).getTime()).toBeLessThan(new Date(thisWeek.start).getTime());
  });
});
