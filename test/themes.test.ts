import { describe, it, expect } from "vitest";
import {
  isThemeId,
  getThemeDefinition,
  isDarkTheme,
  nextThemeId,
  THEME_OPTIONS,
  DEFAULT_THEME,
  type ThemeId,
} from "../src/lib/themes";

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

  it("returns false for an invalid theme id", () => {
    expect(isThemeId("invalid-theme")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(isThemeId("")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isThemeId(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isThemeId(undefined)).toBe(false);
  });
});

describe("getThemeDefinition", () => {
  it("returns the correct definition for classic-dark", () => {
    const def = getThemeDefinition("classic-dark");
    expect(def.id).toBe("classic-dark");
    expect(def.name).toBe("Classic Dark");
    expect(def.mode).toBe("dark");
  });

  it("returns the correct definition for modern-light-blue", () => {
    const def = getThemeDefinition("modern-light-blue");
    expect(def.id).toBe("modern-light-blue");
    expect(def.name).toBe("Modern Light Blue");
    expect(def.mode).toBe("light");
  });

  it("returns the correct definition for nordic-frost", () => {
    const def = getThemeDefinition("nordic-frost");
    expect(def.id).toBe("nordic-frost");
    expect(def.name).toBe("Nordic Frost");
    expect(def.mode).toBe("dark");
  });

  it("returns the correct definition for cyberpunk-matrix", () => {
    const def = getThemeDefinition("cyberpunk-matrix");
    expect(def.id).toBe("cyberpunk-matrix");
    expect(def.name).toBe("Cyberpunk / Matrix");
    expect(def.mode).toBe("dark");
  });

  it("falls back to the first option for an unknown id", () => {
    const def = getThemeDefinition("unknown" as ThemeId);
    expect(def.id).toBe(THEME_OPTIONS[0].id);
  });
});

describe("isDarkTheme", () => {
  it("returns true for classic-dark", () => {
    expect(isDarkTheme("classic-dark")).toBe(true);
  });

  it("returns true for nordic-frost", () => {
    expect(isDarkTheme("nordic-frost")).toBe(true);
  });

  it("returns true for cyberpunk-matrix", () => {
    expect(isDarkTheme("cyberpunk-matrix")).toBe(true);
  });

  it("returns false for modern-light-blue", () => {
    expect(isDarkTheme("modern-light-blue")).toBe(false);
  });
});

describe("nextThemeId", () => {
  it("wraps from the last theme back to the first", () => {
    const lastTheme = THEME_OPTIONS[THEME_OPTIONS.length - 1].id;
    const next = nextThemeId(lastTheme);
    expect(next).toBe(THEME_OPTIONS[0].id);
  });

  it("moves to the next theme for classic-dark", () => {
    const next = nextThemeId("classic-dark");
    expect(THEME_OPTIONS.some((t) => t.id === next)).toBe(true);
    expect(next).not.toBe("classic-dark");
  });

  it("cycles through all themes in order", () => {
    const ids = THEME_OPTIONS.map((t) => t.id);
    let current = ids[0];
    const visited = new Set<string>();
    for (let i = 0; i < ids.length; i++) {
      visited.add(current);
      current = nextThemeId(current as ThemeId);
    }
    // All themes should be visited once before wrapping
    expect(visited.size).toBe(ids.length);
  });

  it("defaults to first theme for an unknown current theme", () => {
    const next = nextThemeId("not-a-theme" as ThemeId);
    expect(THEME_OPTIONS.some((t) => t.id === next)).toBe(true);
  });
});

describe("THEME_OPTIONS", () => {
  it("contains exactly four theme options", () => {
    expect(THEME_OPTIONS).toHaveLength(4);
  });

  it("has a matching default theme in options", () => {
    expect(THEME_OPTIONS.some((t) => t.id === DEFAULT_THEME)).toBe(true);
  });

  it("each theme has a valid mode", () => {
    for (const theme of THEME_OPTIONS) {
      expect(["light", "dark"]).toContain(theme.mode);
    }
  });

  it("each theme has a non-empty name and description", () => {
    for (const theme of THEME_OPTIONS) {
      expect(theme.name.length).toBeGreaterThan(0);
      expect(theme.description.length).toBeGreaterThan(0);
    }
  });
});
