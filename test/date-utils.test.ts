import { describe, it, expect, vi, afterEach } from "vitest";
import {
  formatDate,
  formatRelativeDate,
  daysBetween,
  isToday,
  isYesterday,
} from "../src/lib/date-utils";

afterEach(() => {
  vi.useRealTimers();
});

describe("formatDate", () => {
  it("formats date as MMM D, YYYY", () => {
    const d = new Date("2026-05-24T12:00:00Z");
    expect(formatDate(d)).toBe("May 24, 2026");
  });

  it("handles single-digit month and day", () => {
    const d = new Date("2026-01-05T12:00:00Z");
    expect(formatDate(d)).toBe("Jan 5, 2026");
  });

  it("accepts string and number timestamps", () => {
    expect(formatDate("2026-12-25T00:00:00Z")).toBe("Dec 25, 2026");
    const ms = new Date("2026-07-04T00:00:00Z").getTime();
    expect(formatDate(ms)).toBe("Jul 4, 2026");
  });

  it("throws error for invalid dates", () => {
    expect(() => formatDate("invalid-date-string")).toThrow("Invalid date");
    expect(() => formatDate(NaN)).toThrow("Invalid date");
  });
});

describe("formatRelativeDate", () => {
  it("returns 'Today' for date within 24 hours", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00Z"));

    expect(formatRelativeDate(Date.now() - 2 * 60 * 60 * 1000)).toBe("Today");
    expect(formatRelativeDate(Date.now() - 23 * 60 * 60 * 1000)).toBe("Today");
  });

  it("returns 'Yesterday' for a date between 24 and 48 hours ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00Z"));

    expect(formatRelativeDate(Date.now() - 25 * 60 * 60 * 1000)).toBe("Yesterday");
    expect(formatRelativeDate(Date.now() - 47 * 60 * 60 * 1000)).toBe("Yesterday");
  });

  it("returns 'X days ago' for dates between 2 and 29 days ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00Z"));

    expect(formatRelativeDate(Date.now() - 2 * 24 * 60 * 60 * 1000 - 1000)).toBe("2 days ago");
    expect(formatRelativeDate(Date.now() - 29 * 24 * 60 * 60 * 1000 - 1000)).toBe("29 days ago");
  });

  it("returns absolute formatted date for 30 or more days ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00Z"));

    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000 - 1000;
    expect(formatRelativeDate(thirtyDaysAgo)).toBe(formatDate(thirtyDaysAgo));
  });

  it("throws error for invalid dates", () => {
    expect(() => formatRelativeDate("invalid-date")).toThrow("Invalid date");
  });
});

describe("daysBetween", () => {
  it("returns positive difference when B is after A", () => {
    expect(daysBetween("2026-05-01", "2026-05-10")).toBe(9);
  });

  it("returns negative difference when B is before A", () => {
    expect(daysBetween("2026-05-10", "2026-05-01")).toBe(-9);
  });

  it("returns 0 for the same day in UTC", () => {
    expect(daysBetween("2026-05-24T02:00:00Z", "2026-05-24T22:00:00Z")).toBe(0);
  });

  it("handles leap years correctly", () => {
    // 2024 is a leap year (Feb has 29 days)
    expect(daysBetween("2024-02-28", "2024-03-01")).toBe(2);
    // 2023 is not a leap year (Feb has 28 days)
    expect(daysBetween("2023-02-28", "2023-03-01")).toBe(1);
  });

  it("handles year boundaries crossing", () => {
    expect(daysBetween("2025-12-31", "2026-01-01")).toBe(1);
    expect(daysBetween("2025-12-31", "2026-12-31")).toBe(365);
  });

  it("handles DST boundaries correctly (avoiding off-by-one errors)", () => {
    // US DST Start in 2026: March 8 (clocks go forward by 1 hour)
    expect(daysBetween("2026-03-07T12:00:00Z", "2026-03-09T12:00:00Z")).toBe(2);

    // US DST End in 2026: November 1 (clocks go back by 1 hour)
    expect(daysBetween("2026-10-31T12:00:00Z", "2026-11-02T12:00:00Z")).toBe(2);
  });

  it("throws error for invalid date inputs", () => {
    expect(() => daysBetween("invalid", "2026-01-01")).toThrow("Invalid date");
    expect(() => daysBetween("2026-01-01", "invalid")).toThrow("Invalid date");
  });
});

describe("isToday", () => {
  it("returns true only for today's date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00Z")); // Local Monday

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    expect(isToday(startOfToday)).toBe(true);
    expect(isToday(endOfToday)).toBe(true);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    expect(isToday(tomorrow)).toBe(false);
    expect(isToday(yesterday)).toBe(false);
  });

  it("returns false for invalid date input", () => {
    expect(isToday("invalid-date-format")).toBe(false);
  });
});

describe("isYesterday", () => {
  it("returns true only for yesterday's date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00Z"));

    const startOfYesterday = new Date();
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    startOfYesterday.setHours(0, 0, 0, 0);
    
    const endOfYesterday = new Date();
    endOfYesterday.setDate(endOfYesterday.getDate() - 1);
    endOfYesterday.setHours(23, 59, 59, 999);

    expect(isYesterday(startOfYesterday)).toBe(true);
    expect(isYesterday(endOfYesterday)).toBe(true);

    const today = new Date();
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    expect(isYesterday(today)).toBe(false);
    expect(isYesterday(twoDaysAgo)).toBe(false);
  });

  it("returns false for invalid date input", () => {
    expect(isYesterday("invalid-date-format")).toBe(false);
  });
});
