"use client";

import { useEffect, useRef, useState, type SVGProps } from "react";
import { Theme, themes } from "@/lib/themes";
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

const CheckIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

type ThemeToggleProps = {
  variant?: "default" | "compact";
};

function ThemeIcon({ themeKey }: { themeKey: Theme }) {
  const isDark = themes[themeKey].mode === "dark";
  return isDark ? (
    <MoonIcon className="h-4 w-4" aria-hidden="true" />
  ) : (
    <SunIcon className="h-4 w-4" aria-hidden="true" />
  );
}

function CompactThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!mounted || !theme) {
    return (
      <div className="inline-flex h-8 w-8 shrink-0 rounded-lg border border-[var(--border)] bg-[var(--card)]" />
    );
  }

  const handleSelect = (nextTheme: Theme) => {
    setTheme(nextTheme);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)] transition-all duration-200 hover:bg-[var(--control)] active:scale-95"
        aria-label="Choose theme"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <ThemeIcon themeKey={theme} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Theme options"
          className="absolute right-0 top-full z-50 mt-2 w-[220px] rounded-xl border border-[var(--border)] bg-[var(--card)] p-2 shadow-lg"
        >
          <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
            Theme
          </p>
          <ul className="mt-1 space-y-0.5">
            {Object.entries(themes).map(([themeKey, config]) => {
              const isActive = theme === themeKey;
              return (
                <li key={themeKey}>
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={isActive}
                    onClick={() => handleSelect(themeKey as Theme)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors ${
                      isActive
                        ? "bg-[var(--accent-soft)] text-[var(--foreground)]"
                        : "text-[var(--card-foreground)] hover:bg-[var(--control)]"
                    }`}
                  >
                    <span
                      className="h-3 w-3 shrink-0 rounded-full border border-black/10"
                      style={{ backgroundColor: config.preview.accent }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium">{config.label}</span>
                      <span className="block truncate text-[10px] text-[var(--muted-foreground)]">
                        {config.mode === "dark" ? "Dark Theme" : "Light Theme"}
                      </span>
                    </span>
                    {isActive && (
                      <CheckIcon className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" aria-hidden="true" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function DefaultThemeToggle() {
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

  const isDark = themes[theme].mode === "dark";

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

export default function ThemeToggle({ variant = "default" }: ThemeToggleProps) {
  if (variant === "compact") {
    return <CompactThemeToggle />;
  }

  return <DefaultThemeToggle />;
}
