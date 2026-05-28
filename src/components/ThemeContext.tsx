"use client";

import React, { createContext, useContext, useEffect, useLayoutEffect, useState } from "react";

import { Theme, themes } from "@/lib/themes";

interface ThemeContextType {
  theme: Theme | undefined;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = "theme";

const useSafeLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setTheme] = useState<Theme | undefined>(undefined);

  useEffect(() => {
    const storedTheme = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (storedTheme) {
      setTheme(storedTheme);
    } else {
      setTheme("light");
    }
  }, []);

  useSafeLayoutEffect(() => {
    if (!theme) return;

    const root = document.documentElement;

    const themeClasses = [
      "theme-dracula",
      "theme-nord",
      "theme-catppuccin-mocha",
      "theme-solarized-dark",
    ];

    root.classList.remove(...themeClasses);

    const currentTheme = themes[theme];
    const isDarkTheme = currentTheme.mode === "dark";

    root.classList.toggle("dark", isDarkTheme);

    if (theme !== "light" && theme !== "dark") {
      root.classList.add(`theme-${theme}`);
    }

    root.style.colorScheme = isDarkTheme ? "dark" : "light";

    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => {
      if (prev === "light") {
        return "dark";
      }

      return "light";
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
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