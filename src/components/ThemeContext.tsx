"use client";

import React, { createContext, useContext, useEffect, useLayoutEffect, useState } from "react";

export type Theme = "classic-dark" | "modern-light" | "nordic-frost" | "cyberpunk";

interface ThemeContextType {
  theme: Theme | undefined;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = "theme";

const useSafeLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setThemeState] = useState<Theme>(() => "classic-dark");

  useEffect(() => {
    const storedTheme = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (storedTheme === "classic-dark" || storedTheme === "modern-light" || storedTheme === "nordic-frost" || storedTheme === "cyberpunk") {
      setThemeState(storedTheme);
      return;
    }
    // Handle old 'dark'/'light' values migration
    if ((storedTheme as any) === "dark") {
      setThemeState("classic-dark");
    } else if ((storedTheme as any) === "light") {
      setThemeState("modern-light");
    }
  }, []);

  useSafeLayoutEffect(() => {
    if (theme) {
      document.documentElement.setAttribute("data-theme", theme);
      document.documentElement.classList.toggle("dark", theme !== "modern-light");
      document.documentElement.style.colorScheme = theme === "modern-light" ? "light" : "dark";
      localStorage.setItem(STORAGE_KEY, theme);
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
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
