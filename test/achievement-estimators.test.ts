import { describe, it, expect } from "vitest";
import {
  TIERS_STANDARD,
  TIERS_STARSTRUCK,
  calculateNextTier,
  calculatePercentage,
} from "@/lib/achievement-estimators";

describe("achievement-estimators", () => {
  describe("TIERS_STANDARD", () => {
    it("is [1, 16, 128, 1024]", () => {
      expect(TIERS_STANDARD).toEqual([1, 16, 128, 1024]);
    });
  });

  describe("TIERS_STARSTRUCK", () => {
    it("is [16, 128, 512, 4096]", () => {
      expect(TIERS_STARSTRUCK).toEqual([16, 128, 512, 4096]);
    });
  });

  describe("calculateNextTier", () => {
    describe("with TIERS_STANDARD", () => {
      it("returns first tier when current is below first tier", () => {
        expect(calculateNextTier(0, TIERS_STANDARD)).toBe(1);
        expect(calculateNextTier(0.5, TIERS_STANDARD)).toBe(1);
      });

      it("returns next tier when current is at a tier boundary", () => {
        expect(calculateNextTier(1, TIERS_STANDARD)).toBe(16);
        expect(calculateNextTier(16, TIERS_STANDARD)).toBe(128);
        expect(calculateNextTier(128, TIERS_STANDARD)).toBe(1024);
      });

      it("returns null when current is at or above max tier", () => {
        expect(calculateNextTier(1024, TIERS_STANDARD)).toBe(null);
        expect(calculateNextTier(2000, TIERS_STANDARD)).toBe(null);
      });

      it("returns next higher tier when current is between tiers", () => {
        expect(calculateNextTier(5, TIERS_STANDARD)).toBe(16);
        expect(calculateNextTier(100, TIERS_STANDARD)).toBe(128);
      });
    });

    describe("with TIERS_STARSTRUCK", () => {
      it("returns first tier when current is below first tier", () => {
        expect(calculateNextTier(0, TIERS_STARSTRUCK)).toBe(16);
      });

      it("returns next tier when current is at a tier boundary", () => {
        expect(calculateNextTier(16, TIERS_STARSTRUCK)).toBe(128);
        expect(calculateNextTier(128, TIERS_STARSTRUCK)).toBe(512);
        expect(calculateNextTier(512, TIERS_STARSTRUCK)).toBe(4096);
      });

      it("returns null when current is at or above max tier", () => {
        expect(calculateNextTier(4096, TIERS_STARSTRUCK)).toBe(null);
        expect(calculateNextTier(10000, TIERS_STARSTRUCK)).toBe(null);
      });
    });

    it("handles empty tiers array", () => {
      expect(calculateNextTier(10, [])).toBe(null);
    });
  });

  describe("calculatePercentage", () => {
    it("returns floor(current / nextTier * 100) when below next tier", () => {
      expect(calculatePercentage(0, 16)).toBe(0);
      expect(calculatePercentage(8, 16)).toBe(50);
      expect(calculatePercentage(15, 16)).toBe(93);
    });

    it("returns 100 when at or above next tier", () => {
      expect(calculatePercentage(16, 16)).toBe(100);
      expect(calculatePercentage(100, 16)).toBe(100);
    });

    it("returns 100 when nextTier is null (maxed out)", () => {
      expect(calculatePercentage(0, null)).toBe(100);
      expect(calculatePercentage(1024, null)).toBe(100);
      expect(calculatePercentage(10000, null)).toBe(100);
    });

    it("floors the percentage", () => {
      // 1/3 = 33.333... -> floor = 33
      expect(calculatePercentage(1, 3)).toBe(33);
      // 7/8 = 87.5 -> floor = 87
      expect(calculatePercentage(7, 8)).toBe(87);
    });

    it("handles zero current", () => {
      expect(calculatePercentage(0, 100)).toBe(0);
      expect(calculatePercentage(0, null)).toBe(100);
    });
  });
});
