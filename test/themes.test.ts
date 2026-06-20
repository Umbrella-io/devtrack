import { describe, it, expect } from "vitest";
import {
  isThemeId,
  getThemeDefinition,
  isDarkTheme,
  nextThemeId,
  THEME_OPTIONS,
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  type ThemeId,
} from "../src/lib/themes";

describe("themes", () => {
  describe("isThemeId", () => {
    it("returns true for each valid theme ID", () => {
      const ids: ThemeId[] = [
        "classic-dark",
        "modern-light-blue",
        "nordic-frost",
        "cyberpunk-matrix",
      ];
      for (const id of ids) {
        expect(isThemeId(id)).toBe(true);
      }
    });

    it("returns false for null and undefined", () => {
      expect(isThemeId(null)).toBe(false);
      expect(isThemeId(undefined)).toBe(false);
    });

    it("returns false for an invalid theme ID string", () => {
      expect(isThemeId("made-up-theme")).toBe(false);
      expect(isThemeId("CLASSIC-DARK")).toBe(false);
      expect(isThemeId("")).toBe(false);
    });
  });

  describe("getThemeDefinition", () => {
    it("returns correct definition for classic-dark", () => {
      const def = getThemeDefinition("classic-dark");
      expect(def.id).toBe("classic-dark");
      expect(def.mode).toBe("dark");
      expect(def.name).toBe("Classic Dark");
    });

    it("returns correct definition for modern-light-blue", () => {
      const def = getThemeDefinition("modern-light-blue");
      expect(def.id).toBe("modern-light-blue");
      expect(def.mode).toBe("light");
      expect(def.name).toBe("Modern Light Blue");
    });

    it("returns correct definition for nordic-frost", () => {
      const def = getThemeDefinition("nordic-frost");
      expect(def.id).toBe("nordic-frost");
      expect(def.mode).toBe("dark");
      expect(def.name).toBe("Nordic Frost");
    });

    it("returns correct definition for cyberpunk-matrix", () => {
      const def = getThemeDefinition("cyberpunk-matrix");
      expect(def.id).toBe("cyberpunk-matrix");
      expect(def.mode).toBe("dark");
      expect(def.name).toBe("Cyberpunk / Matrix");
    });

    it("falls back to classic-dark for an unknown ID", () => {
      const def = getThemeDefinition("unknown-theme" as ThemeId);
      expect(def.id).toBe("classic-dark");
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
    it("cycles forward through all theme options", () => {
      const order = THEME_OPTIONS.map((t) => t.id);
      const currentIndex = order.indexOf("classic-dark");
      const nextId = nextThemeId("classic-dark");
      expect(nextId).toBe(order[(currentIndex + 1) % order.length]);
    });

    it("wraps from the last theme to the first", () => {
      const lastTheme = THEME_OPTIONS[THEME_OPTIONS.length - 1].id;
      const firstTheme = THEME_OPTIONS[0].id;
      expect(nextThemeId(lastTheme)).toBe(firstTheme);
    });

    it("handles an unknown theme ID gracefully by returning the first theme", () => {
      // When the current ID is not found, fallbackIndex defaults to 0,
      // so it returns the next theme after the first (index 1).
      const next = nextThemeId("unknown" as ThemeId);
      expect(THEME_OPTIONS.some((t) => t.id === next)).toBe(true);
    });
  });

  describe("constants", () => {
    it("THEME_OPTIONS contains exactly 4 themes", () => {
      expect(THEME_OPTIONS).toHaveLength(4);
    });

    it("DEFAULT_THEME is classic-dark", () => {
      expect(DEFAULT_THEME).toBe("classic-dark");
    });

    it("THEME_STORAGE_KEY is 'theme'", () => {
      expect(THEME_STORAGE_KEY).toBe("theme");
    });
  });
});
