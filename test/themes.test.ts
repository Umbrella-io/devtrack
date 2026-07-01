/**
 * Tests for src/lib/themes.ts
 *
 * Coverage
 * --------
 * isThemeId           -- valid IDs, invalid strings, null/undefined
 * getThemeDefinition   -- known theme, unknown ID returns DEFAULT_THEME
 * isDarkTheme          -- dark themes, light themes
 * nextThemeId          -- normal advance, wraps around, unknown ID
 */

import { describe, it, expect } from "vitest";
import {
  isThemeId,
  getThemeDefinition,
  isDarkTheme,
  nextThemeId,
  DEFAULT_THEME,
  THEME_OPTIONS,
} from "../src/lib/themes";

describe("isThemeId", () => {
  it("returns true for each valid theme ID", () => {
    for (const theme of THEME_OPTIONS) {
      expect(isThemeId(theme.id)).toBe(true);
    }
  });

  it("returns false for invalid strings", () => {
    expect(isThemeId("not-a-theme")).toBe(false);
    expect(isThemeId("classic-dark-extra")).toBe(false);
    expect(isThemeId("")).toBe(false);
  });

  it("returns false for null and undefined", () => {
    expect(isThemeId(null)).toBe(false);
    expect(isThemeId(undefined)).toBe(false);
  });
});

describe("getThemeDefinition", () => {
  it("returns the correct definition for a known theme", () => {
    const def = getThemeDefinition("nordic-frost");
    expect(def.id).toBe("nordic-frost");
    expect(def.name).toBe("Nordic Frost");
    expect(def.mode).toBe("dark");
  });

  it("returns DEFAULT_THEME definition for an unknown ID", () => {
    const def = getThemeDefinition("unknown-id" as any);
    expect(def.id).toBe(DEFAULT_THEME);
  });

  it("returns DEFAULT_THEME for empty string", () => {
    const def = getThemeDefinition("" as any);
    expect(def.id).toBe(DEFAULT_THEME);
  });
});

describe("isDarkTheme", () => {
  it("returns true for dark-mode themes", () => {
    expect(isDarkTheme("classic-dark")).toBe(true);
    expect(isDarkTheme("nordic-frost")).toBe(true);
    expect(isDarkTheme("cyberpunk-matrix")).toBe(true);
  });

  it("returns false for light-mode themes", () => {
    expect(isDarkTheme("modern-light-blue")).toBe(false);
  });
});

describe("nextThemeId", () => {
  it("advances to the next theme in order", () => {
    expect(nextThemeId("classic-dark")).toBe("modern-light-blue");
    expect(nextThemeId("modern-light-blue")).toBe("nordic-frost");
    expect(nextThemeId("nordic-frost")).toBe("cyberpunk-matrix");
    expect(nextThemeId("cyberpunk-matrix")).toBe("classic-dark");
  });

  it("wraps from last theme back to first", () => {
    const lastTheme = THEME_OPTIONS[THEME_OPTIONS.length - 1].id;
    expect(nextThemeId(lastTheme)).toBe(THEME_OPTIONS[0].id);
  });

  it("uses index 0 as fallback for unknown ID", () => {
    // an unknown ID falls back to index 0, so next is index 1
    expect(nextThemeId("not-a-theme" as any)).toBe(THEME_OPTIONS[1].id);
  });
});
// Issue: #2968
