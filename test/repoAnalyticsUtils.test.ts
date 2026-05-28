import { describe, it, expect } from "vitest";
import { formatDate, formatRelativeDate, formatDisplayDate } from "../src/lib/repoAnalyticsUtils";

describe("repoAnalyticsUtils", () => {
  describe("formatDate", () => {
    it("should format valid ISO string correctly", () => {
      const formatted = formatDate("2026-05-15T12:00:00.000Z");
      // Result depends on locale formatting but typically: 'May 15, 2026'
      expect(formatted).toContain("May");
      expect(formatted).toContain("15");
      expect(formatted).toContain("2026");
    });
  });

  describe("formatRelativeDate", () => {
    it("should return 'Today' for current date", () => {
      const todayIso = new Date().toISOString();
      expect(formatRelativeDate(todayIso)).toBe("Today");
    });

    it("should return 'Yesterday' for a date 1 day ago", () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000 - 1000);
      expect(formatRelativeDate(yesterday.toISOString())).toBe("Yesterday");
    });

    it("should return 'X days ago' for a date less than 30 days ago", () => {
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 - 1000);
      expect(formatRelativeDate(fiveDaysAgo.toISOString())).toBe("5 days ago");
    });

    it("should return absolute formatted date for dates more than 30 days ago", () => {
      const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
      const formatted = formatRelativeDate(fortyDaysAgo.toISOString());
      expect(formatted).not.toContain("days ago");
    });

    it("should return '29 days ago' for exactly 29 days ago", () => {
      const twentyNineDaysAgo = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
      expect(formatRelativeDate(twentyNineDaysAgo.toISOString())).toBe("29 days ago");
    });

    it("should return absolute date for exactly 30 days ago", () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const formatted = formatRelativeDate(thirtyDaysAgo.toISOString());
      expect(formatted).not.toContain("days ago");
    });
  });

  describe("formatDisplayDate", () => {
    it("should convert date input to standard local date string", () => {
      const date = new Date("2026-05-15T12:00:00.000Z");
      expect(formatDisplayDate(date)).toBe(date.toLocaleDateString());
    });
  });
});
