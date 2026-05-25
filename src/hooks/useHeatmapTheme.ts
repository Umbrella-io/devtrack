"use client";

import { CSSProperties, useCallback, useEffect, useMemo, useState } from "react";

export type HeatmapTheme = "default" | "colour-blind-friendly";

export interface HeatmapThemeConfig {
  accent: string;
  secondary: string;
  missed: string;
  border: string;
  text: string;
  levelOne: string;
  levelTwo: string;
  levelThree: string;
  levelFour: string;
}

const STORAGE_KEY = "heatmap-theme";

const themeConfigs: Record<HeatmapTheme, HeatmapThemeConfig> = {
  default: {
    accent: "rgba(16, 185, 129, 1)",
    secondary: "rgba(79, 70, 229, 1)",
    missed: "rgba(148, 163, 184, 0.15)",
    border: "rgba(148, 163, 184, 0.35)",
    text: "var(--card-foreground)",
    levelOne: "rgba(16, 185, 129, 0.35)",
    levelTwo: "rgba(16, 185, 129, 0.55)",
    levelThree: "rgba(79, 70, 229, 0.75)",
    levelFour: "rgba(79, 70, 229, 1)",
  },
  "colour-blind-friendly": {
    accent: "rgba(0, 114, 178, 1)",
    secondary: "rgba(230, 159, 0, 1)",
    missed: "rgba(148, 163, 184, 0.15)",
    border: "rgba(148, 163, 184, 0.35)",
    text: "var(--foreground)",
    levelOne: "rgba(59, 130, 246, 0.35)",
    levelTwo: "rgba(59, 130, 246, 0.55)",
    levelThree: "rgba(249, 115, 22, 0.75)",
    levelFour: "rgba(249, 115, 22, 1)",
  },
};

export function getHeatmapThemeConfig(theme: HeatmapTheme): HeatmapThemeConfig {
  return themeConfigs[theme] ?? themeConfigs.default;
}

export function getHeatmapCellStyle(count: number, config: HeatmapThemeConfig): CSSProperties {
  if (count === 0) {
    return {
      backgroundColor: config.missed,
      borderColor: config.border,
    };
  }

  if (count < 3) {
    return {
      backgroundColor: config.levelOne,
      borderColor: config.border,
    };
  }

  if (count < 6) {
    return {
      backgroundColor: config.levelTwo,
      borderColor: config.border,
    };
  }

  if (count < 10) {
    return {
      backgroundColor: config.levelThree,
      borderColor: config.border,
    };
  }

  return {
    backgroundColor: config.levelFour,
    borderColor: config.border,
  };
}

export function getCalendarCellStyle(count: number, config: HeatmapThemeConfig): CSSProperties {
  if (count === 0) {
    return {
      backgroundColor: config.missed,
      borderColor: config.border,
    };
  }

  if (count < 3) {
    return {
      backgroundColor: config.levelOne,
      borderColor: config.border,
    };
  }

  if (count < 6) {
    return {
      backgroundColor: config.levelTwo,
      borderColor: config.border,
    };
  }

  if (count < 10) {
    return {
      backgroundColor: config.levelThree,
      borderColor: config.border,
    };
  }

  return {
    backgroundColor: config.levelFour,
    borderColor: config.border,
  };
}

export function useHeatmapTheme() {
  const [theme, _setTheme] = useState<HeatmapTheme>("default");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;

    const saved = window.localStorage.getItem(STORAGE_KEY) as HeatmapTheme | null;
    if (saved === "colour-blind-friendly") {
      _setTheme(saved);
      return;
    }

    _setTheme(saved ?? "default");
  }, []);

  const setTheme = (t: HeatmapTheme) => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, t);
      } catch {}
      window.dispatchEvent(new CustomEvent("heatmap-theme-changed", { detail: t }));
    }

    _setTheme(t);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onStorage = (ev: StorageEvent) => {
      if (ev.key === STORAGE_KEY && typeof ev.newValue === "string") {
        _setTheme(ev.newValue as HeatmapTheme);
      }
    };

    const onCustom = (ev: Event) => {
      const detail = (ev as CustomEvent).detail as HeatmapTheme | undefined;
      if (detail) _setTheme(detail);
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("heatmap-theme-changed", onCustom as EventListener);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("heatmap-theme-changed", onCustom as EventListener);
    };
  }, []);

  const themeConfig = useMemo(() => getHeatmapThemeConfig(theme), [theme]);

  const getHeatmapStyle = useCallback(
    (count: number) => getHeatmapCellStyle(count, themeConfig),
    [themeConfig]
  );

  const getCalendarStyle = useCallback(
    (count: number) => getCalendarCellStyle(count, themeConfig),
    [themeConfig]
  );

  return {
    theme: mounted ? theme : "default",
    setTheme,
    themeConfig,
    getHeatmapStyle,
    getCalendarStyle,
  };
}
