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
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [minutesAgo, setMinutesAgo] = useState(0);
  const [label, setLabel] = useState("");
  const [target, setTarget] = useState(7);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadGoals = useCallback(async () => {
    const response = await fetch("/api/goals");
    const data: { goals: Goal[] } = await response.json();
    setGoals(data.goals ?? []);
  }, []);

  useEffect(() => {
    loadGoals()
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        setLastUpdated(new Date());
        setMinutesAgo(0);
      });
  }, [loadGoals]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    try {
      const response = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, target }),
      });

      if (!response.ok) {
        throw new Error("Failed to create goal");
      }
    } catch {
      setCreateError("Failed to create goal. Please try again.");
      setCreating(false);
      return;
    }

    setLabel("");
    setTarget(7);
    await loadGoals().catch(() => {});
    setCreating(false);
  }

  async function handleDelete(id: string) {
    const previousGoals = goals;
    setGoals((prev) => prev.filter((g) => g.id !== id));
    setConfirmingId(null);
    setDeletingId(id);

    try {
      const res = await fetch(`/api/goals/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setGoals(previousGoals);
      }
    } catch {
      setGoals(previousGoals);
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    if (!lastUpdated) return;
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - lastUpdated.getTime()) / 60000);
      setMinutesAgo(diff);
    }, 60000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  if (loading) {
    return (
      <div className="h-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <div className="mb-4 h-5 w-32 rounded bg-[var(--card-muted)] animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="mb-4">
            <div className="h-4 bg-[var(--card-muted)] rounded animate-pulse mb-2" />
            <div className="h-2 bg-[var(--card-muted)] rounded animate-pulse" />
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
          No goals yet. Create one below.
        </p>
      ) : (
        <ul className="space-y-4">
          {goals.map((goal) => {
            const pct = Math.min((goal.current / goal.target) * 100, 100);
            const isConfirming = confirmingId === goal.id;
            const isDeleting = deletingId === goal.id;

            return (
              <li key={goal.id}>
                <div className="flex justify-between items-center text-sm mb-1">
                  <span className="text-[var(--card-foreground)]">{goal.label}</span>

                  <div className="flex items-center gap-2">
                    <span className="text-[var(--muted-foreground)]">
                      {goal.current}/{goal.target}
                    </span>

                    {isConfirming ? (
                      <span className="flex items-center gap-1 text-xs">
                        <span className="text-[var(--muted-foreground)]">Delete?</span>
                        <button
                          onClick={() => handleDelete(goal.id)}
                          disabled={isDeleting}
                          className="text-red-400 hover:text-red-300 font-semibold transition-colors disabled:opacity-50"
                          aria-label={`Confirm delete goal: ${goal.label}`}
                        >
                          Yes
                        </button>
                        <span className="text-[var(--muted-foreground)]">/</span>
                        <button
                          onClick={() => setConfirmingId(null)}
                          className="text-[var(--muted-foreground)] hover:text-[var(--card-foreground)] transition-colors"
                          aria-label="Cancel delete"
                        >
                          No
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmingId(goal.id)}
                        disabled={isDeleting}
                        className="text-[var(--muted-foreground)] hover:text-red-400 transition-colors disabled:opacity-50"
                        aria-label={`Delete goal: ${goal.label}`}
                        title="Delete goal"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="w-4 h-4"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
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
      {lastUpdated && (
        <p className="text-xs text-[var(--muted-foreground)] mt-2 text-right">
          {minutesAgo === 0 ? "Updated just now" : `Updated ${minutesAgo} min ago`}
        </p>
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
            onChange={(e) => setLabel(e.target.value)}
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
            onChange={(e) => setTarget(Number(e.target.value))}
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
        {createError && (
          <p className="text-sm text-red-500">{createError}</p>
        )}
      </form>
    </div>
  );
}