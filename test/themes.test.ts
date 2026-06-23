import { describe, it, expect } from "vitest";
import {
  THEME_OPTIONS,
  DEFAULT_THEME,
  isThemeId,
  getThemeDefinition,
  isDarkTheme,
  nextThemeId,
  type ThemeId,
} from "@/lib/themes";

describe("themes", () => {
  describe("THEME_OPTIONS", () => {
    it("has exactly 4 theme options", () => {
      expect(THEME_OPTIONS).toHaveLength(4);
    });

    it("contains classic-dark, modern-light-blue, nordic-frost, and cyberpunk-matrix", () => {
      const ids = THEME_OPTIONS.map((t) => t.id);
      expect(ids).toContain("classic-dark");
      expect(ids).toContain("modern-light-blue");
      expect(ids).toContain("nordic-frost");
      expect(ids).toContain("cyberpunk-matrix");
    });

    it("each theme has id, name, description, and mode", () => {
      for (const theme of THEME_OPTIONS) {
        expect(typeof theme.id).toBe("string");
        expect(theme.id.length).toBeGreaterThan(0);
        expect(typeof theme.name).toBe("string");
        expect(theme.name.length).toBeGreaterThan(0);
        expect(typeof theme.description).toBe("string");
        expect(theme.description.length).toBeGreaterThan(0);
        expect(theme.mode).toMatch(/^(light|dark)$/);
      }
    });
  });

  describe("DEFAULT_THEME", () => {
    it("is classic-dark", () => {
      expect(DEFAULT_THEME).toBe("classic-dark");
    });
  });

  describe("isThemeId", () => {
    it("returns true for classic-dark", () => {
      expect(isThemeId("classic-dark")).toBe(true);
    });

    it("returns true for modern-light-blue", () => {
      expect(isThemeId("modern-light-blue")).toBe(true);
    });

    it("returns true for nordic-frost", () => {
      expect(isThemeId("nordic-frost")).toBe(true);
    });

    it("returns true for cyberpunk-matrix", () => {
      expect(isThemeId("cyberpunk-matrix")).toBe(true);
    });

    it("returns false for null", () => {
      expect(isThemeId(null)).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(isThemeId(undefined)).toBe(false);
    });

    it("returns false for an invalid string", () => {
      expect(isThemeId("not-a-theme")).toBe(false);
    });

    it("returns false for an empty string", () => {
      expect(isThemeId("")).toBe(false);
    });

    it("returns false for random strings", () => {
      expect(isThemeId("dark")).toBe(false);
      expect(isThemeId("light")).toBe(false);
      expect(isThemeId("classic")).toBe(false);
    });
  });

  describe("getThemeDefinition", () => {
    it("returns correct definition for classic-dark", () => {
      const def = getThemeDefinition("classic-dark");
      expect(def.id).toBe("classic-dark");
      expect(def.mode).toBe("dark");
    });

    it("returns correct definition for modern-light-blue", () => {
      const def = getThemeDefinition("modern-light-blue");
      expect(def.id).toBe("modern-light-blue");
      expect(def.mode).toBe("light");
    });

    it("returns correct definition for nordic-frost", () => {
      const def = getThemeDefinition("nordic-frost");
      expect(def.id).toBe("nordic-frost");
      expect(def.mode).toBe("dark");
    });

    it("returns correct definition for cyberpunk-matrix", () => {
      const def = getThemeDefinition("cyberpunk-matrix");
      expect(def.id).toBe("cyberpunk-matrix");
      expect(def.mode).toBe("dark");
    });

    it("falls back to classic-dark for unknown IDs", () => {
      const def = getThemeDefinition("unknown-theme" as ThemeId);
      expect(def.id).toBe("classic-dark");
    });

    it("falls back for null input", () => {
      const def = getThemeDefinition(null as unknown as ThemeId);
      expect(def.id).toBe("classic-dark");
    });
  });

  describe("isDarkTheme", () => {
    it("returns true for classic-dark", () => {
      expect(isDarkTheme("classic-dark")).toBe(true);
    });

    it("returns false for modern-light-blue", () => {
      expect(isDarkTheme("modern-light-blue")).toBe(false);
    });

    it("returns true for nordic-frost", () => {
      expect(isDarkTheme("nordic-frost")).toBe(true);
    });

    it("returns true for cyberpunk-matrix", () => {
      expect(isDarkTheme("cyberpunk-matrix")).toBe(true);
    });

    it("returns true for unknown ID (falls back to classic-dark)", () => {
      expect(isDarkTheme("not-a-theme" as ThemeId)).toBe(true);
    });
  });

  describe("nextThemeId", () => {
    it("cycles from classic-dark to modern-light-blue", () => {
      expect(nextThemeId("classic-dark")).toBe("modern-light-blue");
    });

    it("cycles from modern-light-blue to nordic-frost", () => {
      expect(nextThemeId("modern-light-blue")).toBe("nordic-frost");
    });

    it("cycles from nordic-frost to cyberpunk-matrix", () => {
      expect(nextThemeId("nordic-frost")).toBe("cyberpunk-matrix");
    });

    it("wraps from cyberpunk-matrix back to classic-dark", () => {
      expect(nextThemeId("cyberpunk-matrix")).toBe("classic-dark");
    });

    it("cycles from unknown ID (falls back to first theme and advances one)", () => {
      // Unknown falls back to index 0 (classic-dark), then advances to index 1
      expect(nextThemeId("invalid" as ThemeId)).toBe("modern-light-blue");
    });
  });
});
