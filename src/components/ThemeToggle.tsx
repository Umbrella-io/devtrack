"use client";

import { useEffect, useState } from "react";
import { useTheme, Theme } from "./ThemeContext";
import { Palette } from "lucide-react";

const THEMES: { value: Theme; label: string }[] = [
  { value: "classic-dark", label: "Classic Dark" },
  { value: "modern-light", label: "Modern Light" },
  { value: "nordic-frost", label: "Nordic Frost" },
  { value: "cyberpunk", label: "Cyberpunk" },
];

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !theme) {
    return (
      <div className="inline-flex h-10 w-[145px] items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-4" />
    );
  }

  return (
    <div className="relative inline-flex h-10 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-medium text-[var(--card-foreground)] transition-all duration-300 hover:bg-[var(--control)] group">
      <Palette className="h-4 w-4 text-[var(--muted-foreground)] group-hover:text-[var(--foreground)] transition-colors" />
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value as Theme)}
        className="appearance-none bg-transparent outline-none pr-5 cursor-pointer text-[var(--card-foreground)] font-medium"
        aria-label="Select theme"
      >
        {THEMES.map((t) => (
          <option key={t.value} value={t.value} className="bg-[var(--card)] text-[var(--foreground)]">
            {t.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute right-3 flex items-center justify-center">
        <svg className="h-3 w-3 fill-current text-[var(--muted-foreground)]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
        </svg>
      </div>
    </div>
  );
}