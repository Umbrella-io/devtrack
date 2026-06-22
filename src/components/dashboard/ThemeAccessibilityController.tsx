'use client';

import React, { useEffect, useState } from 'react';
import { Eye, Moon, RefreshCw, Sun, ZoomIn, ZoomOut } from 'lucide-react';

export default function ThemeAccessibilityController() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [fontSizeDelta, setFontSizeDelta] = useState<number>(0);

  // 1. Client-side Theme Preferences Initialization
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('devtrack_theme') as 'light' | 'dark' | null;
      const savedContrast = localStorage.getItem('devtrack_contrast') === 'true';
      const savedFontSizeDelta = Number(localStorage.getItem('devtrack_font_size_delta') ?? 0);
      const safeFontSizeDelta = Number.isFinite(savedFontSizeDelta)
        ? Math.min(4, Math.max(-2, savedFontSizeDelta))
        : 0;

      if (savedTheme) {
        setTheme(savedTheme);
        document.documentElement.classList.toggle('dark', savedTheme === 'dark');
      }

      setHighContrast(savedContrast);
      setFontSizeDelta(safeFontSizeDelta);
      document.documentElement.classList.toggle('contrast-high', savedContrast);
      document.documentElement.style.fontSize =
        safeFontSizeDelta === 0 ? '' : `${100 + safeFontSizeDelta * 10}%`;
    }
  }, []);

  // 2. Toggle Dark Mode Preferences Engine
  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('devtrack_theme', nextTheme);
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
  };

  // 3. Toggle High Contrast Framework Mode
  const toggleContrast = () => {
    const nextContrast = !highContrast;
    setHighContrast(nextContrast);
    localStorage.setItem('devtrack_contrast', String(nextContrast));
    document.documentElement.classList.toggle('contrast-high', nextContrast);
  };

  // 4. Handle Zoom Font Adjustments
  const adjustFontSize = (action: 'increase' | 'decrease' | 'reset') => {
    let nextDelta = fontSizeDelta;
    if (action === 'increase' && fontSizeDelta < 4) nextDelta += 2;
    if (action === 'decrease' && fontSizeDelta > -2) nextDelta -= 2;
    if (action === 'reset') nextDelta = 0;

    setFontSizeDelta(nextDelta);
    localStorage.setItem('devtrack_font_size_delta', String(nextDelta));
    document.documentElement.style.fontSize = nextDelta === 0 ? '' : `${100 + nextDelta * 10}%`;
  };

  return (
    <div className="w-full min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-zinc-900 sm:p-5">
      <div className="space-y-4">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-bold leading-tight text-gray-900 dark:text-gray-100 sm:text-base">
            <span className="min-w-0">
              Interface Customization & Accessibility Controls
            </span>
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
            Configure WCAG 2.1 compliant themes, contrast indices, and responsive display scale parameters.
          </p>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-3 pt-1 sm:grid-cols-2 xl:grid-cols-3">
          {/* Toggle Theme Control Button */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode visual preference`}
            aria-pressed={theme === 'dark'}
            className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-gray-200 p-3 text-gray-700 shadow-sm transition-all hover:bg-gray-50 dark:border-gray-800 dark:text-gray-200 dark:hover:bg-zinc-800"
          >
            <div className="flex min-w-0 items-center gap-2 text-xs font-semibold">
              {theme === 'dark' ? (
                <Moon className="h-4 w-4 shrink-0 text-amber-500" />
              ) : (
                <Sun className="h-4 w-4 shrink-0 text-amber-600" />
              )}
              <span className="truncate">Theme Option</span>
            </div>
            <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider dark:bg-zinc-800">
              {theme}
            </span>
          </button>

          {/* Toggle High Contrast Button */}
          <button
            type="button"
            onClick={toggleContrast}
            aria-label="Toggle high contrast visibility filters"
            aria-pressed={highContrast}
            className={`flex min-w-0 items-center justify-between gap-3 rounded-xl border p-3 shadow-sm transition-all ${
              highContrast
                ? 'border-emerald-500 bg-emerald-50/10 text-emerald-600 dark:text-emerald-400'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-200 dark:hover:bg-zinc-800'
            }`}
          >
            <div className="flex min-w-0 items-center gap-2 text-xs font-semibold">
              <Eye className="h-4 w-4 shrink-0" />
              <span className="truncate">High Contrast</span>
            </div>
            <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider dark:bg-zinc-800">
              {highContrast ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Font Zoom Scale Controls Matrix */}
          <div className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-gray-200 bg-gray-50/50 p-1.5 shadow-sm dark:border-gray-800 dark:bg-zinc-950/20 sm:col-span-2 xl:col-span-1">
            <button
              type="button"
              onClick={() => adjustFontSize('decrease')}
              aria-label="Decrease interface text font size"
              className="rounded-lg p-2 text-gray-600 transition-all hover:bg-white dark:text-gray-400 dark:hover:bg-zinc-800"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => adjustFontSize('reset')}
              aria-label="Reset font sizing settings back to default parameters"
              className="inline-flex min-w-0 items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-bold text-gray-500 transition-all hover:bg-white dark:text-gray-400 dark:hover:bg-zinc-800"
            >
              <RefreshCw className="h-3 w-3 shrink-0" />
              <span className="truncate">{100 + fontSizeDelta * 10}%</span>
            </button>
            <button
              type="button"
              onClick={() => adjustFontSize('increase')}
              aria-label="Increase interface text font size"
              className="rounded-lg p-2 text-gray-600 transition-all hover:bg-white dark:text-gray-400 dark:hover:bg-zinc-800"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
