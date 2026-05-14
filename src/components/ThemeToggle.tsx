"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "theme";

export default function ThemeToggle() {
  const [dark, setDark] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const storedTheme = localStorage.getItem(STORAGE_KEY);
    const isDark = storedTheme ? storedTheme === "dark" : true;

    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    localStorage.setItem(STORAGE_KEY, isDark ? "dark" : "light");
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
    localStorage.setItem(STORAGE_KEY, dark ? "dark" : "light");
  }, [dark, mounted]);

  if (!mounted) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => setDark((current) => !current)}
      className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--card-foreground)] transition-colors hover:bg-[var(--control)]"
      aria-label="Toggle theme"
      aria-pressed={dark}
    >
      <span aria-hidden="true">{dark ? "☀️" : "🌙"}</span>
      <span>{dark ? "Light" : "Dark"}</span>
    </button>
  );
}
