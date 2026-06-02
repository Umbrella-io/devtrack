"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DailyFocusRecord } from "@/app/api/daily-focus/route";

type TodayFocusHeroProps = {
  userName?: string | null;
};

const PROMPTS = [
  "What are you building today?",
  "What is one small win you want today?",
  "Ship one meaningful thing today.",
  "What problem are you solving today?",
  "Make one part of your project better today.",
];

// Legacy localStorage key prefix — used only for migration on first load.
const STORAGE_PREFIX = "devtrack_today_goal_";

function getTodayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${STORAGE_PREFIX}${y}-${m}-${d}`;
}

function getTodayDate(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getGreeting(hour: number): "morning" | "afternoon" | "evening" {
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

function getDailyPrompt(date = new Date()): string {
  const dayIndex = Math.floor(date.getTime() / 86400000);
  return PROMPTS[Math.abs(dayIndex) % PROMPTS.length];
}

export default function TodayFocusHero({ userName }: TodayFocusHeroProps) {
  const [goal, setGoal] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [prompt, setPrompt] = useState(PROMPTS[0]);
  const [greeting, setGreeting] = useState<"morning" | "afternoon" | "evening">(
    "morning"
  );
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Stable refs so async callbacks never capture stale values.
  const todayDate = useRef("");
  const todayKey = useRef("");

  const greetingLabel = useMemo(() => {
    const base =
      greeting === "morning"
        ? "Good morning"
        : greeting === "afternoon"
          ? "Good afternoon"
          : "Good evening";
    return userName?.trim() ? `${base}, ${userName.trim()}` : base;
  }, [greeting, userName]);

  // Migrate an existing localStorage entry to the server.
  // Only removes the localStorage copy after a confirmed successful PUT.
  const migrateLocalStorage = useCallback(
    async (stored: string, date: string, key: string): Promise<boolean> => {
      try {
        const res = await fetch("/api/daily-focus", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ goal_text: stored, focus_date: date }),
        });
        if (res.ok) {
          try {
            window.localStorage.removeItem(key);
          } catch {
            // Removing is best-effort.
          }
          return true;
        }
      } catch {
        // Network failure — keep localStorage as-is.
      }
      return false;
    },
    []
  );

  const loadFocus = useCallback(
    async (date: string, key: string) => {
      setIsLoading(true);
      setServerError(null);
      try {
        const res = await fetch(`/api/daily-focus?date=${date}`);

        if (!res.ok) {
          if (res.status === 401) {
            // Not signed in — use localStorage only (read-only mode).
            try {
              const stored = window.localStorage.getItem(key)?.trim() ?? "";
              setGoal(stored);
              setInputValue(stored);
              setIsEditing(stored.length === 0);
            } catch {
              setIsEditing(true);
            }
            return;
          }
          setServerError("Failed to load today's focus.");
          return;
        }

        const json = (await res.json()) as {
          focus: DailyFocusRecord | null;
        };

        if (json.focus) {
          // Server is the source of truth — discard any leftover localStorage copy.
          setGoal(json.focus.goal_text);
          setInputValue(json.focus.goal_text);
          setIsEditing(false);
          try {
            window.localStorage.removeItem(key);
          } catch {
            // Best-effort cleanup.
          }
        } else {
          // No server record — check for a localStorage value to migrate.
          try {
            const stored = window.localStorage.getItem(key)?.trim() ?? "";
            if (stored) {
              await migrateLocalStorage(stored, date, key);
              setGoal(stored);
              setInputValue(stored);
              setIsEditing(false);
            } else {
              setGoal("");
              setInputValue("");
              setIsEditing(true);
            }
          } catch {
            setGoal("");
            setInputValue("");
            setIsEditing(true);
          }
        }
      } catch {
        // Network failure — fall back to localStorage.
        try {
          const stored = window.localStorage.getItem(key)?.trim() ?? "";
          setGoal(stored);
          setInputValue(stored);
          setIsEditing(stored.length === 0);
        } catch {
          setGoal("");
          setInputValue("");
          setIsEditing(true);
        }
        setServerError(
          "Could not reach the server. Changes may not sync across devices."
        );
      } finally {
        setIsLoading(false);
      }
    },
    [migrateLocalStorage]
  );

  useEffect(() => {
    const now = new Date();
    todayDate.current = getTodayDate(now);
    todayKey.current = getTodayKey(now);
    setGreeting(getGreeting(now.getHours()));
    setPrompt(getDailyPrompt(now));
    setIsMounted(true);
    void loadFocus(todayDate.current, todayKey.current);
  }, [loadFocus]);

  async function handleSave() {
    const trimmed = inputValue.trim();
    const date = todayDate.current;
    const key = todayKey.current;
    if (!trimmed || !date) return;

    // Optimistic update.
    const prevGoal = goal;
    setGoal(trimmed);
    setInputValue(trimmed);
    setIsEditing(false);
    setIsSaving(true);
    setServerError(null);

    try {
      const res = await fetch("/api/daily-focus", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal_text: trimmed, focus_date: date }),
      });

      if (!res.ok) {
        // Roll back on server error.
        setGoal(prevGoal);
        setInputValue(trimmed);
        setIsEditing(true);
        setServerError("Failed to save. Please try again.");
        // Keep a localStorage fallback so data is not lost.
        try {
          window.localStorage.setItem(key, trimmed);
        } catch {
          // Storage write failed.
        }
        return;
      }

      // Successfully persisted — remove any stale localStorage copy.
      try {
        window.localStorage.removeItem(key);
      } catch {
        // Best-effort cleanup.
      }
    } catch {
      // Network failure — keep the optimistic state and save locally.
      try {
        window.localStorage.setItem(key, trimmed);
      } catch {
        // Storage write failed.
      }
      setServerError(
        "Saved locally. Will sync when your connection is restored."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleClear() {
    const date = todayDate.current;
    const key = todayKey.current;
    if (!date) return;

    // Optimistic update.
    const prevGoal = goal;
    setGoal("");
    setInputValue("");
    setIsEditing(true);
    setIsSaving(true);
    setServerError(null);

    try {
      const res = await fetch(`/api/daily-focus?date=${date}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        // Roll back.
        setGoal(prevGoal);
        setInputValue(prevGoal);
        setIsEditing(false);
        setServerError("Failed to clear. Please try again.");
        return;
      }

      try {
        window.localStorage.removeItem(key);
      } catch {
        // Best-effort cleanup.
      }
    } catch {
      // Network failure — keep the optimistic cleared state.
      try {
        window.localStorage.removeItem(key);
      } catch {
        // Best-effort cleanup.
      }
      setServerError(
        "Cleared locally. Will sync when your connection is restored."
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleEdit() {
    setInputValue(goal);
    setIsEditing(true);
  }

  // SSR skeleton — identical to the original to avoid layout shift.
  if (!isMounted) {
    return (
      <section className="surface-card fade-up relative overflow-hidden rounded-3xl border border-[var(--border)] px-5 py-6 shadow-sm md:px-8 md:py-8">
        <div className="space-y-4">
          <div className="h-6 w-52 rounded skeleton-shimmer" />
          <div className="h-4 w-full max-w-xl rounded skeleton-shimmer" />
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="h-12 rounded-xl skeleton-shimmer" />
            <div className="flex gap-3">
              <div className="h-12 w-24 rounded-xl skeleton-shimmer" />
              <div className="h-12 w-24 rounded-xl skeleton-shimmer" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="surface-card fade-up relative overflow-hidden rounded-3xl border border-[var(--border)] px-5 py-6 shadow-sm md:px-8 md:py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.16),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.1),transparent_28%)]" />
      <div className="pointer-events-none absolute right-0 top-0 h-28 w-28 rounded-full bg-[var(--accent-soft)] blur-3xl" />

      <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.95fr)] lg:items-stretch">
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
              Today&apos;s Focus
            </p>
            <h1
              className="text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl"
              style={{ fontFamily: "var(--font-syne, system-ui, sans-serif)" }}
            >
              {greetingLabel}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-[var(--muted-foreground)] sm:text-base">
              {prompt}
            </p>
          </div>

          <p className="text-sm text-[var(--muted-foreground)] sm:text-base">
            Progress is built one focused session at a time.
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_92%,white_8%)] p-4 shadow-[0_14px_34px_-26px_rgba(15,23,42,0.35)] sm:p-5">
          {isLoading ? (
            <div className="flex h-full flex-col gap-3">
              <div className="h-4 w-32 rounded skeleton-shimmer" />
              <div className="h-12 w-full rounded-xl skeleton-shimmer" />
            </div>
          ) : goal && !isEditing ? (
            <div className="flex h-full flex-col justify-between gap-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                  Today&apos;s Focus
                </p>
                <p className="text-lg font-semibold leading-7 text-[var(--card-foreground)] sm:text-xl">
                  {goal}
                </p>
              </div>

              {serverError ? (
                <p role="alert" className="text-xs text-[var(--destructive)]">
                  {serverError}
                </p>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleEdit}
                  disabled={isSaving}
                  className="secondary-button inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-medium disabled:opacity-60 sm:w-auto"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleClear();
                  }}
                  disabled={isSaving}
                  className="inline-flex w-full items-center justify-center rounded-xl border border-[var(--destructive-muted-border)] bg-[var(--destructive-muted)] px-4 py-3 text-sm font-medium text-[var(--destructive)] transition hover:opacity-90 disabled:opacity-60 sm:w-auto"
                >
                  {isSaving ? "Clearing…" : "Clear"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                  Set your goal for today
                </p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Save a single goal for this day. You can update it anytime.
                </p>
              </div>

              {serverError ? (
                <p role="alert" className="text-xs text-[var(--destructive)]">
                  {serverError}
                </p>
              ) : null}

              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                <label className="block">
                  <span className="sr-only">
                    Write your main dev goal for today
                  </span>
                  <input
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && inputValue.trim()) {
                        void handleSave();
                      }
                    }}
                    placeholder="Write your main dev goal for today..."
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] shadow-sm transition placeholder:text-[var(--muted-foreground)] focus:border-[var(--accent)] focus-visible:outline-none"
                  />
                </label>

                <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                  <button
                    type="button"
                    onClick={() => {
                      void handleSave();
                    }}
                    disabled={!inputValue.trim() || isSaving}
                    className="primary-button inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto lg:w-full xl:w-auto"
                  >
                    {isSaving ? "Saving…" : "Save"}
                  </button>
                  {goal ? (
                    <button
                      type="button"
                      onClick={() => {
                        void handleClear();
                      }}
                      disabled={isSaving}
                      className="secondary-button inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-medium disabled:opacity-60 sm:w-auto lg:w-full xl:w-auto"
                    >
                      Clear
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
