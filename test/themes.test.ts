import { describe, it, expect } from "vitest";
import {
  isThemeId,
  getThemeDefinition,
  isDarkTheme,
  nextThemeId,
  THEME_OPTIONS,
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

  it("returns false for invalid string", () => {
    expect(isThemeId("not-a-theme")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isThemeId("")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isThemeId(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isThemeId(undefined)).toBe(false);
  });

  it("returns false for partial match", () => {
    expect(isThemeId("classic")).toBe(false);
    expect(isThemeId("classic-dark-extra")).toBe(false);
  });
});

describe("getThemeDefinition", () => {
  it("returns correct definition for classic-dark", () => {
    const def = getThemeDefinition("classic-dark");
    expect(def.id).toBe("classic-dark");
    expect(def.name).toBe("Classic Dark");
    expect(def.mode).toBe("dark");
  });

  it("returns correct definition for modern-light-blue", () => {
    const def = getThemeDefinition("modern-light-blue");
    expect(def.id).toBe("modern-light-blue");
    expect(def.name).toBe("Modern Light Blue");
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

  it("falls back to classic-dark for invalid theme id", () => {
    const def = getThemeDefinition("invalid-theme" as never);
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
});

describe("nextThemeId", () => {
  it("returns modern-light-blue when current is classic-dark", () => {
    expect(nextThemeId("classic-dark")).toBe("modern-light-blue");
  });

  it("returns nordic-frost when current is modern-light-blue", () => {
    expect(nextThemeId("modern-light-blue")).toBe("nordic-frost");
  });

  it("returns cyberpunk-matrix when current is nordic-frost", () => {
    expect(nextThemeId("nordic-frost")).toBe("cyberpunk-matrix");
  });

  it("wraps to classic-dark when current is cyberpunk-matrix", () => {
    expect(nextThemeId("cyberpunk-matrix")).toBe("classic-dark");
  });

  it("falls back to modern-light-blue for invalid theme id", () => {
    // index 0 (classic-dark) is invalid, so fallbackIndex = 0, then (0+1) % 4 = 1
    expect(nextThemeId("invalid" as never)).toBe("modern-light-blue");
  });
});
