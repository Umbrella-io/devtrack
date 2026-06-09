"use client";

import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useState } from "react";
import {
  DEFAULT_THEME,
  getThemeDefinition,
  isThemeId,
  nextThemeId,
  THEME_STORAGE_KEY,
  type ThemeId,
} from "@/lib/themes";

interface ThemeContextType {
  theme: ThemeId | undefined;
  themeMode: "light" | "dark" | undefined;
  themeDefinition: ReturnType<typeof getThemeDefinition> | undefined;
  setTheme: (theme: ThemeId) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const useSafeLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, updateTheme] = useState<ThemeId | undefined>(undefined);

  useSafeLayoutEffect(() => {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemeId(storedTheme)) {
      updateTheme(storedTheme);
      return;
    }
    updateTheme(DEFAULT_THEME);
  }, []);

  useSafeLayoutEffect(() => {
    if (!theme) return;

    const html = document.documentElement;
    const definition = getThemeDefinition(theme);

    html.dataset.theme = theme;
    html.classList.toggle("dark", definition.mode === "dark");
    html.style.colorScheme = definition.mode;
  }, [theme]);

  useEffect(() => {
    if (!theme) return;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = useCallback((nextTheme: ThemeId) => {
    updateTheme(nextTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    updateTheme((prev) => nextThemeId(prev ?? DEFAULT_THEME));
  }, []);

  const themeDefinition = theme ? getThemeDefinition(theme) : undefined;
  const value: ThemeContextType = {
    theme,
    themeMode: themeDefinition?.mode,
    themeDefinition,
    setTheme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
