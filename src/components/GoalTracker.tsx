"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { stripHtml } from "@/lib/sanitize";

interface Goal {
  id: string;
  label: string;
  target: number;
  current: number;
}

export default function GoalTracker() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [target, setTarget] = useState(7);
  const [creating, setCreating] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);

  const loadGoals = useCallback(async () => {
    const response = await fetch("/api/goals");
    const data: { goals: Goal[] } = await response.json();
    setGoals(data.goals ?? []);
  }, []);

  useEffect(() => {
    loadGoals()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [loadGoals]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);

    const sanitizedLabel = stripHtml(label).slice(0, 100);
    if (!sanitizedLabel) {
      setCreating(false);
      return;
    }

    try {
      const response = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: sanitizedLabel, target }),
      });

      if (!response.ok) {
        throw new Error("Failed to create goal");
      }

      setLabel("");
      setTarget(7);
      await loadGoals();

      if (statusRef.current) {
        statusRef.current.textContent = `Goal "${sanitizedLabel}" added successfully.`;
      }
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div
        className="h-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-6"
        role="status"
        aria-label="Loading weekly goals"
      >
        <div className="mb-4 h-5 w-32 rounded bg-[var(--card-muted)] animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="mb-4">
            <div className="mb-2 h-3 rounded bg-[var(--card-muted)] animate-pulse" />
            <div className="h-2 rounded bg-[var(--card-muted)] animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <section
      aria-labelledby="weekly-goals-heading"
      className="h-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm"
    >
      {/* Live region for goal creation feedback */}
      <div ref={statusRef} aria-live="polite" aria-atomic="true" className="sr-only" />

      <h2
        id="weekly-goals-heading"
        className="mb-4 text-lg font-semibold text-[var(--card-foreground)]"
      >
        Weekly Goals
      </h2>

      {goals.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">
          No goals yet. Add one using the form below.
        </p>
      ) : (
        <ul className="space-y-4" aria-label="Your weekly goals">
          {goals.map((goal) => {
            const pct = Math.min((goal.current / goal.target) * 100, 100);
            const safeLabel = stripHtml(goal.label);
            const progressId = `progress-${goal.id}`;
            return (
              <li key={goal.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span
                    id={progressId}
                    className="text-[var(--card-foreground)]"
                  >
                    {safeLabel}
                  </span>
                  <span
                    className="text-[var(--muted-foreground)]"
                    aria-label={`${goal.current} of ${goal.target} completed`}
                  >
                    {goal.current}/{goal.target}
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={Math.round(pct)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-labelledby={progressId}
                  aria-label={`${safeLabel}: ${Math.round(pct)}% complete`}
                  className="h-2 overflow-hidden rounded-full bg-[var(--control)]"
                >
                  <div
                    className="h-full rounded-full bg-[var(--accent)] transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form
        onSubmit={handleCreate}
        className="mt-6 space-y-3 border-t border-[var(--border)] pt-4"
        aria-label="Add a new weekly goal"
        noValidate
      >
        <div>
          <label
            htmlFor="goal-label"
            className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]"
          >
            Goal label
          </label>
          <input
            id="goal-label"
            type="text"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Commit every day"
            required
            maxLength={100}
            disabled={creating}
            aria-required="true"
            aria-describedby="goal-label-hint"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-[var(--accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
          />
          <p id="goal-label-hint" className="sr-only">
            Enter a short description for your goal, up to 100 characters.
          </p>
        </div>
        <div>
          <label
            htmlFor="goal-target"
            className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]"
          >
            Weekly target (days)
          </label>
          <input
            id="goal-target"
            type="number"
            min={1}
            max={365}
            value={target}
            onChange={(event) => setTarget(Number(event.target.value))}
            disabled={creating}
            aria-required="true"
            aria-describedby="goal-target-hint"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
          />
          <p id="goal-target-hint" className="sr-only">
            Enter a number between 1 and 365 for how many days per week to target.
          </p>
        </div>
        <button
          type="submit"
          disabled={creating || !label.trim()}
          aria-disabled={creating || !label.trim()}
          aria-busy={creating}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {creating ? (
            <>
              <span
                className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white"
                aria-hidden="true"
              />
              Creating...
            </>
          ) : (
            "Add goal"
          )}
        </button>
      </form>
    </section>
  );
}