"use client";

import { useEffect, useState } from "react";
import { useTheme } from "./ThemeContext";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !theme) {
    return (
      <div className="inline-flex h-10 w-32 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-4" />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
    className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-4 text-sm font-medium text-[var(--card-foreground)] transition-colors hover:bg-[var(--control)]"
      aria-label="Toggle theme"
      aria-pressed={isDark}
    >
      {isDark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
      <span>{isDark ? "Light" : "Dark"}</span>
    </button>
  );
}
