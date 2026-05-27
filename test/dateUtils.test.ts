import { describe, it, expect, vi, afterEach } from "vitest";
import {
  toDateStr,
  dateDiffDays,
  getThisWeekRange,
  getLastWeekRange,
} from "../src/lib/dateUtils";

// 每个测试后恢复真实时间
afterEach(() => {
  vi.useRealTimers();
});

describe("toDateStr", () => {
  it("should convert a Date to ISO date string (YYYY-MM-DD)", () => {
    const date = new Date("2024-03-15T12:30:00Z");
    expect(toDateStr(date)).toBe("2024-03-15");
  });

  it("should handle end-of-year boundary", () => {
    const newYear = new Date("2023-12-31T23:59:59Z");
    expect(toDateStr(newYear)).toBe("2023-12-31");
  });

  it("should produce UTC date (not locale)", () => {
    const date = new Date(Date.UTC(2024, 0, 1, 1, 0, 0));
    expect(toDateStr(date)).toBe("2024-01-01");
  });
});

describe("dateDiffDays", () => {
  it("should return correct day difference between two date strings", () => {
    expect(dateDiffDays("2024-01-01", "2024-01-10")).toBe(9);
  });

  it("should handle same-day difference", () => {
    expect(dateDiffDays("2024-06-15", "2024-06-15")).toBe(0);
  });

  it("should handle leap year dates", () => {
    // 2024 is a leap year, so Feb 28 -> Mar 1 = 2 days
    expect(dateDiffDays("2024-02-28", "2024-03-01")).toBe(2);
  });
});

describe("getThisWeekRange", () => {
  it("should return start as Monday 00:00 UTC and end as current day 23:59:59 UTC", () => {
    // Mock "now" to a Wednesday in UTC
    const mockNow = new Date("2024-04-17T10:00:00Z");
    vi.useFakeTimers();
    vi.setSystemTime(mockNow);

    const range = getThisWeekRange();

    // Monday of that week (2024-04-15)
    const expectedStart = new Date(Date.UTC(2024, 3, 15, 0, 0, 0, 0)).toISOString();
    // Wednesday end (2024-04-17, 23:59:59.000Z)
    const expectedEnd = new Date(Date.UTC(2024, 3, 17, 23, 59, 59, 0)).toISOString();

    expect(range.start).toBe(expectedStart);
    expect(range.end).toBe(expectedEnd);
  });

  it("should handle Sunday (end equals start when today is Monday)", () => {
    const mockMonday = new Date("2024-04-22T08:00:00Z"); // Monday
    vi.useFakeTimers();
    vi.setSystemTime(mockMonday);

    const range = getThisWeekRange();

    const expectedStart = new Date(Date.UTC(2024, 3, 22, 0, 0, 0, 0)).toISOString();
    const expectedEnd = new Date(Date.UTC(2024, 3, 22, 23, 59, 59, 0)).toISOString();

    expect(range.start).toBe(expectedStart);
    expect(range.end).toBe(expectedEnd);
  });

  it("should handle month/year transition", () => {
    // 2024-01-01 is a Monday
    const mockNewYear = new Date("2024-01-01T12:00:00Z");
    vi.useFakeTimers();
    vi.setSystemTime(mockNewYear);

    const range = getThisWeekRange();

    const expectedStart = new Date(Date.UTC(2024, 0, 1, 0, 0, 0, 0)).toISOString();
    const expectedEnd = new Date(Date.UTC(2024, 0, 1, 23, 59, 59, 0)).toISOString();

    expect(range.start).toBe(expectedStart);
    expect(range.end).toBe(expectedEnd);
  });
});

describe("getLastWeekRange", () => {
  it("should return previous Monday-Sunday range", () => {
    const mockNow = new Date("2024-04-17T10:00:00Z"); // Wednesday
    vi.useFakeTimers();
    vi.setSystemTime(mockNow);

    const range = getLastWeekRange();

    // Previous Monday = 2024-04-08, Sunday = 2024-04-14
    const expectedStart = new Date(Date.UTC(2024, 3, 8, 0, 0, 0, 0)).toISOString();
    const expectedEnd = new Date(Date.UTC(2024, 3, 14, 23, 59, 59, 0)).toISOString();

    expect(range.start).toBe(expectedStart);
    expect(range.end).toBe(expectedEnd);
  });

  it("should handle year transition (first week of January)", () => {
    const mockNewYear = new Date("2024-01-03T10:00:00Z"); // Wednesday
    vi.useFakeTimers();
    vi.setSystemTime(mockNewYear);

    const range = getLastWeekRange();

    // Previous week: Monday 2023-12-25, Sunday 2023-12-31
    const expectedStart = new Date(Date.UTC(2023, 11, 25, 0, 0, 0, 0)).toISOString();
    const expectedEnd = new Date(Date.UTC(2023, 11, 31, 23, 59, 59, 0)).toISOString();

    expect(range.start).toBe(expectedStart);
    expect(range.end).toBe(expectedEnd);
  });

  it("should handle leap year dates (Feb 29)", () => {
    // 2024-03-04 is a Monday
    const mockLeapWeek = new Date("2024-03-04T12:00:00Z"); // Monday
    vi.useFakeTimers();
    vi.setSystemTime(mockLeapWeek);

    const range = getLastWeekRange();

    // Previous week: Monday 2024-02-26, Sunday 2024-03-03 (includes Feb 29)
    const expectedStart = new Date(Date.UTC(2024, 1, 26, 0, 0, 0, 0)).toISOString();
    const expectedEnd = new Date(Date.UTC(2024, 2, 3, 23, 59, 59, 0)).toISOString();

    expect(range.start).toBe(expectedStart);
    expect(range.end).toBe(expectedEnd);
  });
});
