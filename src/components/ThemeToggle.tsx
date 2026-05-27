"use client";

import { useEffect, useState, type SVGProps } from "react";
import { useTheme } from "./ThemeContext";

const SunIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="12" cy="12" r="5" />
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
);

const MoonIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M21 12.79A9 9 0 0 1 11.21 3 7 7 0 1 0 21 12.79z" />
  </svg>
);

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
      className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-4 text-sm font-medium text-[var(--card-foreground)] transition-all duration-300 hover:bg-[var(--control)] active:scale-95"
      aria-label="Toggle theme"
      aria-pressed={isDark}
    >
      <span className="transition-transform duration-300">
        {isDark ? (
          <MoonIcon className="h-[18px] w-[18px]" aria-hidden="true" />
        ) : (
          <SunIcon className="h-[18px] w-[18px]" aria-hidden="true" />
        )}
      </span>
      <span className="transition-colors duration-300">
        {isDark ? "Dark" : "Light"}
      </span>
    </button>
  );
}