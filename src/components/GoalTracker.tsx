"use client";

import { useCallback, useEffect, useState } from "react";

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

    try {
      const response = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, target }),
      });

      if (!response.ok) {
        throw new Error("Failed to create goal");
      }

      setLabel("");
      setTarget(7);
      await loadGoals();
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="h-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
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
    <div className="h-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-[var(--card-foreground)]">Weekly Goals</h2>
      {goals.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">
          No goals yet. Create one via the API or future UI.
        </p>
      ) : (
        <ul className="space-y-4">
          {goals.map((goal) => {
            const pct = Math.min((goal.current / goal.target) * 100, 100);
            return (
              <li key={goal.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[var(--card-foreground)]">{goal.label}</span>
                  <span className="text-[var(--muted-foreground)]">
                    {goal.current}/{goal.target}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--control)]">
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
      <form onSubmit={handleCreate} className="mt-6 space-y-3 border-t border-[var(--border)] pt-4">
        <div>
          <label htmlFor="goal-label" className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
            Goal label
          </label>
          <input
            id="goal-label"
            type="text"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Commit every day"
            required
            disabled={creating}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-[var(--accent)]"
          />
        </div>
        <div>
          <label htmlFor="goal-target" className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
            Weekly target
          </label>
          <input
            id="goal-target"
            type="number"
            min={1}
            value={target}
            onChange={(event) => setTarget(Number(event.target.value))}
            disabled={creating}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
          />
        </div>
        <button
          type="submit"
          disabled={creating || !label.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {creating ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Creating...
            </>
          ) : (
            "Add goal"
          )}
        </button>
      </form>
    </div>
  );
}
