"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Recurrence = "none" | "weekly" | "monthly";

interface Goal {
  id: string;
  title: string;
  target: number;
  current: number;
  unit: string;
  recurrence: Recurrence;
  period_start: string;
  last_synced_at: string | null;
}

const RECURRENCE_LABELS: Record<Recurrence, string> = {
  none: "One-time",
  weekly: "Weekly",
  monthly: "Monthly",
};

export default function GoalTracker() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [minutesAgo, setMinutesAgo] = useState(0);

  const [title, setTitle] = useState("");
  const [target, setTarget] = useState(7);
  const [unit, setUnit] = useState("commits");
  const [recurrence, setRecurrence] = useState<Recurrence>("none");

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [activeConfettiGoalId, setActiveConfettiGoalId] = useState<string | null>(null);

  const prevGoalsRef = useRef<Map<string, boolean>>(new Map());
  const initialLoadDoneRef = useRef<boolean>(false);

  const loadGoals = useCallback(async () => {
    const response = await fetch("/api/goals");
    const data: { goals: Goal[] } = await response.json();

    const fetchedGoals = data.goals ?? [];
    setGoals(fetchedGoals);

    return fetchedGoals;
  }, []);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    setSyncError(null);

    try {
      const res = await fetch("/api/goals/sync", {
        method: "POST",
      });

      if (!res.ok) {
        let msg = "Sync failed. Please try again.";

        try {
          const errData = await res.json();

          if (errData?.error) {
            msg = errData.error;
          }
        } catch {}

        if (res.status === 401) {
          msg = "Unauthorized. Please log in again.";
        } else if (res.status === 502) {
          msg = "GitHub sync failed: Expired token or missing repo scope.";
        }

        setSyncError(msg);
        return;
      }

      await loadGoals();

      setLastUpdated(new Date());
      setMinutesAgo(0);
    } catch {
      setSyncError("Network error. Failed to sync goals.");
    } finally {
      setSyncing(false);
    }
  }, [loadGoals]);

  useEffect(() => {
    loadGoals()
      .then(async (fetchedGoals) => {
        const needsSync = fetchedGoals.some((g: Goal) => {
          if (g.unit !== "commits") return false;

          if (!g.last_synced_at) return true;

          const syncedAt = new Date(g.last_synced_at).getTime();

          return Date.now() - syncedAt > 15 * 60 * 1000;
        });

        if (needsSync) {
          await handleSync();
        }
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        setLastUpdated(new Date());
        setMinutesAgo(0);
      });
  }, [loadGoals, handleSync]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();

    setCreating(true);
    setCreateError(null);

    try {
      const response = await fetch("/api/goals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          target,
          unit,
          recurrence,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create goal");
      }
    } catch {
      setCreateError("Failed to create goal. Please try again.");
      setCreating(false);
      return;
    }

    setTitle("");
    setTarget(7);
    setUnit("commits");
    setRecurrence("none");

    if (unit === "commits") {
      await handleSync();
    } else {
      await loadGoals().catch(() => {});
    }

    setCreating(false);
  }

  async function handleDelete(id: string) {
    const previousGoals = goals;

    setGoals((prev) => prev.filter((g) => g.id !== id));

    setConfirmingId(null);
    setDeletingId(id);

    try {
      const res = await fetch(`/api/goals/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        setGoals(previousGoals);
      }
    } catch {
      setGoals(previousGoals);
    } finally {
      setDeletingId(null);
    }
  }

  function getCompletionLabel(goal: Goal): string {
    if (goal.current >= goal.target) {
      if (goal.recurrence === "weekly") {
        return "Completed this week ✓";
      }

      if (goal.recurrence === "monthly") {
        return "Completed this month ✓";
      }

      return "Completed ✓";
    }

    return "";
  }

  useEffect(() => {
    if (goals.length === 0) return;

    if (!initialLoadDoneRef.current) {
      const map = new Map<string, boolean>();

      for (const g of goals) {
        map.set(g.id, g.current >= g.target);
      }

      prevGoalsRef.current = map;
      initialLoadDoneRef.current = true;

      return;
    }

    for (const g of goals) {
      const isCompleted = g.current >= g.target;
      const wasCompleted = prevGoalsRef.current.get(g.id);

      if (wasCompleted === false && isCompleted) {
        if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          setActiveConfettiGoalId(g.id);

          setTimeout(() => {
            setActiveConfettiGoalId((curr) =>
              curr === g.id ? null : curr
            );
          }, 2500);
        }
      }

      prevGoalsRef.current.set(g.id, isCompleted);
    }
  }, [goals]);

  useEffect(() => {
    if (!lastUpdated) return;

    const interval = setInterval(() => {
      const diff = Math.floor(
        (Date.now() - lastUpdated.getTime()) / 60000
      );

      setMinutesAgo(diff);
    }, 60000);

    return () => clearInterval(interval);
  }, [lastUpdated]);

  if (loading) {
    return (
      <div className="h-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <div role="status" aria-live="polite" aria-busy="true">
          <span className="sr-only">Loading weekly goals</span>

          <div
            aria-hidden="true"
            className="mb-4 h-5 w-32 rounded bg-[var(--card-muted)] animate-pulse"
          />

          {[1, 2, 3].map((i) => (
            <div key={i} aria-hidden="true" className="mb-4">
              <div className="h-4 bg-[var(--card-muted)] rounded animate-pulse mb-2" />
              <div className="h-2 bg-[var(--card-muted)] rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[var(--card-foreground)]">
          Goals
        </h2>

        <button
          onClick={handleSync}
          disabled={syncing}
          title="Refresh commit-based goals from GitHub"
          aria-label="Refresh commit goals"
          className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 py-1 text-xs text-[var(--muted-foreground)] transition hover:text-[var(--card-foreground)] hover:border-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {syncing ? "Syncing…" : "Refresh"}
        </button>
      </div>

      {syncError && (
        <div className="mb-4 flex items-center justify-between gap-2 rounded-lg border border-[var(--destructive)]/20 bg-[var(--destructive)]/10 px-3 py-2 text-xs text-[var(--destructive)]">
          <span>⚠️ {syncError}</span>

          <button
            type="button"
            onClick={() => setSyncError(null)}
            className="font-semibold"
          >
            ✕
          </button>
        </div>
      )}

      {goals.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">
          No goals yet. Create one below.
        </p>
      ) : (
        <ul className="space-y-4">
          {goals.map((goal) => {
            const pct = Math.min(
              (goal.current / goal.target) * 100,
              100
            );

            const isConfirming = confirmingId === goal.id;
            const isDeleting = deletingId === goal.id;

            const completed = goal.current >= goal.target;

            const completionLabel = getCompletionLabel(goal);

            const isAutoSynced = goal.unit === "commits";

            return (
              <li key={goal.id} className="relative">

                {activeConfettiGoalId === goal.id && (
                  <ConfettiBurst />
                )}

                <div className="flex justify-between items-center text-sm mb-1">

                  <div className="flex flex-col gap-0.5">

                    <div className="flex items-center gap-2 flex-wrap">

                      <span className="text-[var(--card-foreground)]">
                        {goal.title}
                      </span>

                      {goal.recurrence !== "none" && (
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                            goal.recurrence === "weekly"
                              ? "bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/30"
                              : "bg-[var(--card-muted)] text-[var(--muted-foreground)] border-[var(--border)]"
                          }`}
                        >
                          {RECURRENCE_LABELS[goal.recurrence]}
                        </span>
                      )}

                      {isAutoSynced && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-[var(--accent)]/15 px-1.5 py-0.5 text-[10px] font-medium text-[var(--accent)]">
                          ⚡ Auto-synced
                        </span>
                      )}
                    </div>

                    {completed && (
                      <span className="text-xs font-medium text-[var(--success)]">
                        {completionLabel}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">

                    <span className="text-[var(--muted-foreground)]">
                      {goal.current}/{goal.target} {goal.unit}
                    </span>

                    {isConfirming ? (
                      <span className="flex items-center gap-1 text-xs">
                        <span className="text-[var(--muted-foreground)]">
                          Delete?
                        </span>

                        <button
                          onClick={() => handleDelete(goal.id)}
                          disabled={isDeleting}
                          className="text-[var(--destructive)] font-semibold transition-colors disabled:opacity-50"
                        >
                          Yes
                        </button>

                        <span className="text-[var(--muted-foreground)]">
                          /
                        </span>

                        <button
                          onClick={() => setConfirmingId(null)}
                          className="text-[var(--muted-foreground)] hover:text-[var(--card-foreground)] transition-colors"
                        >
                          No
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmingId(goal.id)}
                        disabled={isDeleting}
                        className="text-[var(--muted-foreground)] hover:text-[var(--destructive)] transition-colors disabled:opacity-50"
                        title="Delete goal"
                      >
                        🗑
                      </button>
                    )}
                  </div>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-[var(--control)]">
                  <div
                    className={`h-full rounded-full transition-all ${
                      completed
                        ? "bg-[var(--success)]"
                        : "bg-[var(--accent)]"
                    }`}
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
          {minutesAgo === 0
            ? "Updated just now"
            : `Updated ${minutesAgo} min ago`}
        </p>
      )}

      <form
        onSubmit={handleCreate}
        className="mt-6 space-y-3 border-t border-[var(--border)] pt-4"
      >

        <div>
          <label
            htmlFor="goal-title"
            className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]"
          >
            Goal title
          </label>

          <input
            id="goal-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Make 10 commits"
            required
            disabled={creating}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-[var(--accent)]"
          />
        </div>

        <div className="flex gap-3">

          <div className="flex-1">
            <label
              htmlFor="goal-target"
              className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]"
            >
              Target
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

          <div className="flex-1">
            <label
              htmlFor="goal-unit"
              className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]"
            >
              Unit
            </label>

            <select
              id="goal-unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              disabled={creating}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
            >
              <option value="commits">Commits ⚡</option>
              <option value="prs">PRs</option>
              <option value="hours">Hours</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
            Recurrence
          </label>

          <div className="flex gap-2">
            {(["none", "weekly", "monthly"] as Recurrence[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRecurrence(r)}
                disabled={creating}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium border transition-all ${
                  recurrence === r
                    ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]"
                    : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--accent)]"
                }`}
              >
                {RECURRENCE_LABELS[r]}
              </button>
            ))}
          </div>
        </div>

        {unit === "commits" && (
          <p className="text-xs text-[var(--muted-foreground)] rounded-lg bg-[var(--accent)]/10 px-3 py-2">
            ⚡ This goal will auto-update from your GitHub commit count.
          </p>
        )}

        <button
          type="submit"
          disabled={creating || !title.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {creating ? "Creating..." : "Add goal"}
        </button>

        {createError && (
          <p className="text-sm text-[var(--destructive)]">
            {createError}
          </p>
        )}
      </form>
    </div>
  );
}

function ConfettiBurst() {
  return null;
}