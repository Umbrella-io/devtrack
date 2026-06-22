import { describe, expect, it } from "vitest";
import {
  isThemeId,
  getThemeDefinition,
  isDarkTheme,
  nextThemeId,
  THEME_OPTIONS,
  DEFAULT_THEME,
} from "../src/lib/themes";

describe("isThemeId", () => {
  it("returns true for all valid theme IDs", () => {
    expect(isThemeId("classic-dark")).toBe(true);
    expect(isThemeId("modern-light-blue")).toBe(true);
    expect(isThemeId("nordic-frost")).toBe(true);
    expect(isThemeId("cyberpunk-matrix")).toBe(true);
  });

  it("returns false for invalid strings", () => {
    expect(isThemeId("random-theme")).toBe(false);
    expect(isThemeId("dark")).toBe(false);
    expect(isThemeId("CLASSIC-DARK")).toBe(false);
    expect(isThemeId("")).toBe(false);
  });

  it("returns false for null and undefined", () => {
    expect(isThemeId(null)).toBe(false);
    expect(isThemeId(undefined)).toBe(false);
  });
});

describe("getThemeDefinition", () => {
  it("returns the correct definition for each valid theme ID", () => {
    for (const theme of THEME_OPTIONS) {
      const def = getThemeDefinition(theme.id);
      expect(def.id).toBe(theme.id);
      expect(def.name).toBe(theme.name);
    }
  });

  it("returns the default theme for invalid ID", () => {
    const def = getThemeDefinition("invalid" as any);
    expect(def.id).toBe(DEFAULT_THEME);
  });
});

describe("isDarkTheme", () => {
  it("returns true for dark mode themes", () => {
    expect(isDarkTheme("classic-dark")).toBe(true);
    expect(isDarkTheme("nordic-frost")).toBe(true);
    expect(isDarkTheme("cyberpunk-matrix")).toBe(true);
  });

  it("returns false for light mode themes", () => {
    expect(isDarkTheme("modern-light-blue")).toBe(false);
  });
});

describe("nextThemeId", () => {
  it("cycles through all themes in order", () => {
    const order = THEME_OPTIONS.map((t) => t.id);
    for (let i = 0; i < order.length; i++) {
      const current = order[i];
      const next = nextThemeId(current);
      const expectedNext = order[(i + 1) % order.length];
      expect(next).toBe(expectedNext);
    }
  });

  it("wraps from last theme back to first", () => {
    const lastTheme = THEME_OPTIONS[THEME_OPTIONS.length - 1].id;
    const firstTheme = THEME_OPTIONS[0].id;
    expect(nextThemeId(lastTheme)).toBe(firstTheme);
  });

  it("falls back to first theme for invalid currentTheme", () => {
    const firstTheme = THEME_OPTIONS[0].id;
    expect(nextThemeId("unknown" as any)).toBe(firstTheme);
  });

  it("never returns the same theme consecutively", () => {
    for (const theme of THEME_OPTIONS) {
      expect(nextThemeId(theme)).not.toBe(theme);
    }
  });
});
