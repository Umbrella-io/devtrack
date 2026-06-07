"use client";

import { useEffect, useRef, useState, type SVGProps } from "react";
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

const CheckIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="m20 6-11 11-5-5" />
  </svg>
);

/**
 * Compact theme switcher: a small icon button that opens a
 * dropdown listing all themes. Replaces the wide preview card
 * that was dominating the navbar (issue #2102).
 */
export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  if (!mounted) {
    // Skeleton placeholder matching button size
    return (
      <div className="h-8 w-8 animate-pulse rounded-lg bg-white/5" />
    );
  }

  return (
    <div ref={ref} className="relative">
      {/* Compact icon trigger button */}
      <button
        type="button"
        aria-label="Switch theme"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[var(--muted-foreground)] transition-colors hover:bg-white/10 hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      >
        <PaletteIcon className="h-4 w-4" aria-hidden="true" />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          role="listbox"
          aria-label="Select theme"
          className="absolute right-0 top-full z-50 mt-2 w-52 origin-top-right overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xl"
          style={{ animation: "fadeInScale 0.12s ease both" }}
        >
          <p className="border-b border-white/5 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
            Theme
          </p>
          <ul className="py-1">
            {THEME_OPTIONS.map((option) => {
              const isActive = theme === option.id;
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => {
                      setTheme(option.id as ThemeId);
                      setOpen(false);
                    }}
                    className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/5"
                  >
                    <span
                      className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center"
                      style={{ color: "var(--accent)" }}
                    >
                      {isActive && <CheckIcon className="h-3.5 w-3.5" />}
                    </span>
                    <span className="min-w-0">
                      <span
                        className="block text-[13px] font-medium"
                        style={{
                          color: isActive
                            ? "var(--accent)"
                            : "var(--card-foreground)",
                        }}
                      >
                        {option.name}
                      </span>
                      <span className="block truncate text-[11px] text-[var(--muted-foreground)]">
                        {option.description}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95) translateY(-4px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
      `}</style>
    </div>
  );
}
