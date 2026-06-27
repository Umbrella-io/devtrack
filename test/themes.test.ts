import { describe, it, expect } from "vitest";
import {
  isThemeId,
  getThemeDefinition,
  isDarkTheme,
  nextThemeId,
  DEFAULT_THEME,
  THEME_OPTIONS,
} from "../src/lib/themes";

describe("themes", () => {
  describe("isThemeId", () => {
    it("returns true for a valid theme id", () => {
      expect(isThemeId("classic-dark")).toBe(true);
      expect(isThemeId("modern-light-blue")).toBe(true);
      expect(isThemeId("nordic-frost")).toBe(true);
      expect(isThemeId("cyberpunk-matrix")).toBe(true);
    });

    it("returns false for an invalid theme id", () => {
      expect(isThemeId("nonexistent-theme")).toBe(false);
      expect(isThemeId("classic-dark-extra")).toBe(false);
    });

    it("returns false for null and undefined", () => {
      expect(isThemeId(null)).toBe(false);
      expect(isThemeId(undefined)).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isThemeId("")).toBe(false);
    });
  });

  describe("getThemeDefinition", () => {
    it("returns the correct theme definition for a valid id", () => {
      const def = getThemeDefinition("nordic-frost");
      expect(def.id).toBe("nordic-frost");
      expect(def.mode).toBe("dark");
    });

    it("returns the first theme as fallback for an invalid id", () => {
      const def = getThemeDefinition("invalid-theme" as any);
      expect(def.id).toBe(DEFAULT_THEME);
    });

    it("returns the first theme as fallback for null", () => {
      const def = getThemeDefinition(null as any);
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
    it("cycles through all themes", () => {
      const seen = new Set<string>();
      let current: string = "classic-dark";
      for (let i = 0; i < THEME_OPTIONS.length; i++) {
        current = nextThemeId(current as any);
        expect(seen.has(current)).toBe(false);
        seen.add(current);
      }
      // After full cycle, should return to classic-dark
      expect(seen.size).toBe(THEME_OPTIONS.length);
    });

    it("returns the second theme when current is classic-dark", () => {
      const next = nextThemeId("classic-dark");
      expect(next).toBe("modern-light-blue");
    });

    it("returns second theme as fallback for unknown id (fallbackIndex=0, returns index 1)", () => {
      // When id not found, fallbackIndex=0, then returns THEME_OPTIONS[(0+1)%4].id = modern-light-blue
      const next = nextThemeId("unknown-theme" as any);
      expect(next).toBe("modern-light-blue");
    });
  });
});

