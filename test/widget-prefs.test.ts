import { describe, it, expect } from "vitest";
import {
  WIDGET_KEYS,
  DEFAULT_WIDGET_PREFS,
  mergeWidgetPrefs,
  validateWidgetPrefs,
} from "@/lib/widget-prefs";

describe("WIDGET_KEYS", () => {
  it("has 9 keys", () => {
    expect(WIDGET_KEYS).toHaveLength(9);
  });
});

describe("DEFAULT_WIDGET_PREFS", () => {
  it("all keys default to true", () => {
    for (const key of WIDGET_KEYS) {
      expect(DEFAULT_WIDGET_PREFS[key]).toBe(true);
    }
  });
});

describe("mergeWidgetPrefs", () => {
  it("returns all-visible defaults for null", () => {
    const result = mergeWidgetPrefs(null);
    expect(result).toEqual(DEFAULT_WIDGET_PREFS);
  });

  it("returns all-visible defaults for undefined", () => {
    expect(mergeWidgetPrefs(undefined)).toEqual(DEFAULT_WIDGET_PREFS);
  });

  it("returns all-visible defaults for array", () => {
    expect(mergeWidgetPrefs([])).toEqual(DEFAULT_WIDGET_PREFS);
  });

  it("returns all-visible defaults for string", () => {
    expect(mergeWidgetPrefs("bad")).toEqual(DEFAULT_WIDGET_PREFS);
  });

  it("applies stored boolean overrides", () => {
    const stored = { contributionGraph: false, streakTracker: false };
    const result = mergeWidgetPrefs(stored);
    expect(result.contributionGraph).toBe(false);
    expect(result.streakTracker).toBe(false);
    expect(result.prMetrics).toBe(true);
  });

  it("ignores unknown keys in stored object", () => {
    const stored = { unknownWidget: false, contributionGraph: false };
    const result = mergeWidgetPrefs(stored);
    expect(result.contributionGraph).toBe(false);
    expect((result as any).unknownWidget).toBeUndefined();
  });

  it("ignores non-boolean values for known keys", () => {
    const stored = { contributionGraph: "yes" };
    const result = mergeWidgetPrefs(stored);
    expect(result.contributionGraph).toBe(true);
  });

  it("missing keys default to visible", () => {
    const result = mergeWidgetPrefs({ contributionGraph: false });
    for (const key of WIDGET_KEYS) {
      if (key !== "contributionGraph") {
        expect(result[key]).toBe(true);
      }
    }
  });

  it("full prefs override works", () => {
    const stored: Record<string, boolean> = {};
    for (const key of WIDGET_KEYS) stored[key] = false;
    const result = mergeWidgetPrefs(stored);
    for (const key of WIDGET_KEYS) {
      expect(result[key]).toBe(false);
    }
  });
});

describe("validateWidgetPrefs", () => {
  it("returns null for empty object", () => {
    expect(validateWidgetPrefs({})).toBeNull();
  });

  it("returns null for valid partial prefs", () => {
    expect(validateWidgetPrefs({ contributionGraph: true, streakTracker: false })).toBeNull();
  });

  it("returns null for full valid prefs", () => {
    const prefs: Record<string, boolean> = {};
    for (const key of WIDGET_KEYS) prefs[key] = true;
    expect(validateWidgetPrefs(prefs)).toBeNull();
  });

  it("rejects null", () => {
    expect(validateWidgetPrefs(null)).toBeTruthy();
  });

  it("rejects array", () => {
    expect(validateWidgetPrefs([])).toBeTruthy();
  });

  it("rejects string", () => {
    expect(validateWidgetPrefs("bad")).toBeTruthy();
  });

  it("rejects unknown widget key", () => {
    const err = validateWidgetPrefs({ unknownWidget: true });
    expect(err).toContain("Unknown widget key");
  });

  it("rejects non-boolean value", () => {
    const err = validateWidgetPrefs({ contributionGraph: "yes" });
    expect(err).toContain("must be a boolean");
  });
});
