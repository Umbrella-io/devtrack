"use client";

import { useEffect, useState, type SVGProps } from "react";
import { useTheme } from "./ThemeContext";
import { THEME_OPTIONS, type ThemeId } from "@/lib/themes";

const PaletteIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M12 2a10 10 0 1 0 10 10c0-.55-.45-1-1-1h-2.5a1.5 1.5 0 0 1 0-3H20a1 1 0 0 0 1-1A10 10 0 0 0 12 2Z" />
    <circle cx="8" cy="8" r="1.25" fill="currentColor" stroke="none" />
    <circle cx="16" cy="8" r="1.25" fill="currentColor" stroke="none" />
    <circle cx="16" cy="16" r="1.25" fill="currentColor" stroke="none" />
  </svg>
);

const ChevronIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export default function ThemeToggle() {
  const { theme, themeDefinition, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !theme) {
    return (
      <div className="inline-flex h-12 w-full max-w-[260px] items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 shadow-sm" />
    );
  }

  const currentLabel = themeDefinition?.name ?? "Theme";
  const currentDescription = themeDefinition?.description ?? "Customize the dashboard palette";

  return (
    <label className="inline-flex min-h-12 w-full max-w-[260px] cursor-pointer items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-[var(--card-foreground)] shadow-sm transition-all duration-300 hover:bg-[var(--control)] focus-within:border-[var(--accent)]">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
        <PaletteIcon className="h-4 w-4" aria-hidden="true" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
          Theme
        </span>
        <span className="block truncate text-sm font-semibold text-[var(--card-foreground)]">
          {currentLabel}
        </span>
        <span className="block truncate text-xs text-[var(--muted-foreground)]">
          {currentDescription}
        </span>
      </span>

      <span className="relative flex items-center gap-2">
        <select
          aria-label="Select dashboard theme"
          value={theme}
          onChange={(event) => setTheme(event.target.value as ThemeId)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        >
          {THEME_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>

        <span className="text-xs font-medium text-[var(--muted-foreground)]">Change</span>
        <ChevronIcon className="h-4 w-4 text-[var(--muted-foreground)]" aria-hidden="true" />
      </span>
    </label>
  );
}