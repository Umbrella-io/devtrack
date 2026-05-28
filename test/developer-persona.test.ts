import { describe, it, expect } from "vitest";
import {
  calculateStreaks,
  mergeCommitCounts,
  mergeSignals,
  formatDurationHours,
  choosePersonaCandidate,
  buildSmartInsightCandidates,
  type DeveloperSignals,
  type PersonaKey,
} from "../src/lib/developer-persona";

describe("developer-persona", () => {
  describe("calculateStreaks", () => {
    it("returns zeros for empty commit history", () => {
      const result = calculateStreaks({});
      expect(result.currentStreak).toBe(0);
      expect(result.longestStreak).toBe(0);
      expect(result.totalActiveDays).toBe(0);
    });

    it("returns correct streak info for single day commit", () => {
      const today = new Date().toISOString().slice(0, 10);
      const result = calculateStreaks({ [today]: 3 });
      expect(result.longestStreak).toBe(1);
      expect(result.totalActiveDays).toBe(1);
      expect(result.currentStreak).toBeGreaterThanOrEqual(0);
    });

    it("calculates consecutive days correctly", () => {
      const result = calculateStreaks({
        "2026-05-10": 1,
        "2026-05-11": 1,
        "2026-05-12": 1,
      });
      expect(result.longestStreak).toBe(3);
    });

    it("handles gaps in commit history", () => {
      const result = calculateStreaks({
        "2026-05-10": 1,
        "2026-05-11": 1,
        "2026-05-14": 1,
        "2026-05-15": 1,
      });
      expect(result.longestStreak).toBe(2);
    });

    it("calculates current streak when last day is today", () => {
      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const result = calculateStreaks({
        [yesterday]: 1,
        [today]: 1,
      });
      expect(result.currentStreak).toBe(2);
    });

    it("calculates current streak when last day is yesterday", () => {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
      const result = calculateStreaks({
        [twoDaysAgo]: 1,
        [yesterday]: 1,
      });
      expect(result.currentStreak).toBe(2);
    });

    it("resets current streak when gap is more than 1 day", () => {
      const today = new Date().toISOString().slice(0, 10);
      const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
      const result = calculateStreaks({
        [twoDaysAgo]: 1,
        [today]: 1,
      });
      expect(result.currentStreak).toBe(1);
    });
  });

  describe("mergeCommitCounts", () => {
    it("merges two empty objects", () => {
      const result = mergeCommitCounts({}, {});
      expect(result).toEqual({});
    });

    it("merges with no overlaps", () => {
      const result = mergeCommitCounts(
        { "2026-05-10": 5 },
        { "2026-05-11": 3 }
      );
      expect(result).toEqual({ "2026-05-10": 5, "2026-05-11": 3 });
    });

    it("sums overlapping dates", () => {
      const result = mergeCommitCounts(
        { "2026-05-10": 5 },
        { "2026-05-10": 3 }
      );
      expect(result).toEqual({ "2026-05-10": 8 });
    });

    it("does not mutate original objects", () => {
      const a = { "2026-05-10": 5 };
      const b = { "2026-05-11": 3 };
      mergeCommitCounts(a, b);
      expect(a).toEqual({ "2026-05-10": 5 });
      expect(b).toEqual({ "2026-05-11": 3 });
    });
  });

  describe("mergeSignals", () => {
    it("merges two empty signals", () => {
      const empty: DeveloperSignals = {
        commitCountsByDate: {},
        timeBlocks: { morning: 0, afternoon: 0, evening: 0, night: 0 },
        prsOpened: 0,
        prsMerged: 0,
        prMergeTotalHours: 0,
        prMergeSampleSize: 0,
        additions: 0,
        deletions: 0,
      };
      const result = mergeSignals(empty, empty);
      expect(result.prsOpened).toBe(0);
      expect(result.additions).toBe(0);
    });

    it("sums prsOpened and prsMerged", () => {
      const a: DeveloperSignals = {
        commitCountsByDate: {},
        timeBlocks: { morning: 0, afternoon: 0, evening: 0, night: 0 },
        prsOpened: 5,
        prsMerged: 3,
        prMergeTotalHours: 0,
        prMergeSampleSize: 0,
        additions: 0,
        deletions: 0,
      };
      const b: DeveloperSignals = {
        commitCountsByDate: {},
        timeBlocks: { morning: 0, afternoon: 0, evening: 0, night: 0 },
        prsOpened: 2,
        prsMerged: 1,
        prMergeTotalHours: 0,
        prMergeSampleSize: 0,
        additions: 0,
        deletions: 0,
      };
      const result = mergeSignals(a, b);
      expect(result.prsOpened).toBe(7);
      expect(result.prsMerged).toBe(4);
    });

    it("merges commit counts by date", () => {
      const a: DeveloperSignals = {
        commitCountsByDate: { "2026-05-10": 5 },
        timeBlocks: { morning: 0, afternoon: 0, evening: 0, night: 0 },
        prsOpened: 0,
        prsMerged: 0,
        prMergeTotalHours: 0,
        prMergeSampleSize: 0,
        additions: 0,
        deletions: 0,
      };
      const b: DeveloperSignals = {
        commitCountsByDate: { "2026-05-10": 3, "2026-05-11": 2 },
        timeBlocks: { morning: 0, afternoon: 0, evening: 0, night: 0 },
        prsOpened: 0,
        prsMerged: 0,
        prMergeTotalHours: 0,
        prMergeSampleSize: 0,
        additions: 0,
        deletions: 0,
      };
      const result = mergeSignals(a, b);
      expect(result.commitCountsByDate).toEqual({ "2026-05-10": 8, "2026-05-11": 2 });
    });
  });

  describe("formatDurationHours", () => {
    it("returns 0h for non-finite values", () => {
      expect(formatDurationHours(NaN)).toBe("0h");
      expect(formatDurationHours(Infinity)).toBe("0h");
      expect(formatDurationHours(-1)).toBe("0h");
      expect(formatDurationHours(0)).toBe("0h");
    });

    it("formats minutes for values less than 1 hour", () => {
      expect(formatDurationHours(0.5)).toBe("30m");
      expect(formatDurationHours(0.25)).toBe("15m");
      expect(formatDurationHours(0.75)).toBe("45m");
    });

    it("formats hours for values between 1 and 24", () => {
      expect(formatDurationHours(1)).toBe("1h");
      expect(formatDurationHours(8.5)).toBe("8.5h");
      expect(formatDurationHours(12)).toBe("12h");
    });

    it("formats days for values 24 or more", () => {
      expect(formatDurationHours(24)).toBe("1d");
      expect(formatDurationHours(48)).toBe("2d");
      expect(formatDurationHours(72.5)).toBe("3d");
    });
  });

  describe("choosePersonaCandidate", () => {
    it("returns fallback when no candidates are eligible or scored", () => {
      const candidates = [
        { key: "night_owl" as PersonaKey, score: 0, eligible: false },
        { key: "early_bird" as PersonaKey, score: 0, eligible: false },
      ];
      const result = choosePersonaCandidate(candidates, "balanced_builder");
      expect(result).toBe("balanced_builder");
    });

    it("returns highest scoring eligible candidate", () => {
      const candidates = [
        { key: "night_owl" as PersonaKey, score: 0.8, eligible: true },
        { key: "early_bird" as PersonaKey, score: 0.6, eligible: true },
      ];
      const result = choosePersonaCandidate(candidates, "balanced_builder");
      expect(result).toBe("night_owl");
    });

    it("returns highest scored when no eligible ones but scored candidates exist", () => {
      const candidates = [
        { key: "night_owl" as PersonaKey, score: 0.8, eligible: false },
        { key: "early_bird" as PersonaKey, score: 0.6, eligible: false },
        { key: "refactorer" as PersonaKey, score: 0.4, eligible: false },
      ];
      const result = choosePersonaCandidate(candidates, "balanced_builder");
      expect(result).toBe("night_owl");
    });

    it("returns fallback when no eligible and no scored candidates", () => {
      const candidates = [
        { key: "night_owl" as PersonaKey, score: 0, eligible: false },
        { key: "early_bird" as PersonaKey, score: 0, eligible: false },
      ];
      const result = choosePersonaCandidate(candidates, "balanced_builder");
      expect(result).toBe("balanced_builder");
    });
  });

  describe("buildSmartInsightCandidates", () => {
    it("returns empty array for no signals", () => {
      const signals: DeveloperSignals = {
        commitCountsByDate: {},
        timeBlocks: { morning: 0, afternoon: 0, evening: 0, night: 0 },
        prsOpened: 0,
        prsMerged: 0,
        prMergeTotalHours: 0,
        prMergeSampleSize: 0,
        additions: 0,
        deletions: 0,
      };
      const summary = calculateStreaks({});
      const result = buildSmartInsightCandidates(signals, summary, "balanced_builder");
      expect(result).toEqual([]);
    });

    it("returns steady cadence insight when no other insights apply", () => {
      const signals: DeveloperSignals = {
        commitCountsByDate: { "2026-05-10": 1, "2026-05-11": 2 },
        timeBlocks: { morning: 5, afternoon: 5, evening: 5, night: 0 },
        prsOpened: 0,
        prsMerged: 0,
        prMergeTotalHours: 0,
        prMergeSampleSize: 0,
        additions: 0,
        deletions: 0,
      };
      const summary = calculateStreaks(signals.commitCountsByDate);
      const result = buildSmartInsightCandidates(signals, summary, "balanced_builder");
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].title).toBe("Steady Cadence");
    });
  });
});