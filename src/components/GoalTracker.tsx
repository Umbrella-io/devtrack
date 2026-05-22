"use client";

import { useCallback, useEffect, useState, useRef } from "react";

type Recurrence = "none" | "weekly" | "monthly";

interface Goal {
  id: string;
  title: string;
  target: number;
  current: number;
  unit: string;
  recurrence: Recurrence;
  period_start: string;
}

const RECURRENCE_LABELS: Record<Recurrence, string> = {
  none: "One-time",
  weekly: "Weekly",
  monthly: "Monthly",
};

export default function GoalTracker() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
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
        body: JSON.stringify({ title, target, unit, recurrence }),
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

  function getCompletionLabel(goal: Goal): string {
    if (goal.current >= goal.target) {
      if (goal.recurrence === "weekly") return "Completed this week ✓";
      if (goal.recurrence === "monthly") return "Completed this month ✓";
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
            setActiveConfettiGoalId((curr) => (curr === g.id ? null : curr));
          }, 2500);
        }
      }

      prevGoalsRef.current.set(g.id, isCompleted);
    }
  }, [goals]);

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
            const completed = goal.current >= goal.target;
            const completionLabel = getCompletionLabel(goal);

            return (
              <li key={goal.id} className="relative">
                {activeConfettiGoalId === goal.id && <ConfettiBurst />}
                <div className="flex justify-between items-center text-sm mb-1">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--card-foreground)]">{goal.title}</span>
                      {goal.recurrence !== "none" && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                          goal.recurrence === "weekly"
                            ? "bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/30"
                            : "bg-[var(--card-muted)] text-[var(--muted-foreground)] border-[var(--border)]"
                        }`}>
                          {RECURRENCE_LABELS[goal.recurrence]}
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
                        <span className="text-[var(--muted-foreground)]">Delete?</span>
                        <button
                          onClick={() => handleDelete(goal.id)}
                          disabled={isDeleting}
                          className="text-[var(--destructive)] hover:text-[var(--destructive)] font-semibold transition-colors disabled:opacity-50"
                          aria-label={`Confirm delete goal: ${goal.title}`}
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
                        className="text-[var(--muted-foreground)] hover:text-[var(--destructive)] transition-colors disabled:opacity-50"
                        aria-label={`Delete goal: ${goal.title}`}
                        title="Delete goal"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-[var(--control)]">
                  <div
                    className={`h-full rounded-full transition-all ${completed ? "bg-[var(--success)]" : "bg-[var(--accent)]"}`}
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

      {/* Goal Creation Form */}
      <form onSubmit={handleCreate} className="mt-6 space-y-3 border-t border-[var(--border)] pt-4">
        <div>
          <label htmlFor="goal-title" className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
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
            <label htmlFor="goal-target" className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
              Target
            </label>
            <input
              id="goal-target"
              type="number"
              min={1}
              max={10000}
              value={target}
              onChange={(e) => setTarget(Number(e.target.value))}
              disabled={creating}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="goal-unit" className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
              Unit
            </label>
            <input
              id="goal-unit"
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="commits"
              disabled={creating}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
            />
          </div>
        </div>

        {/* Recurrence Picker */}
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
          {recurrence !== "none" && (
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              {recurrence === "weekly" ? "Resets every Monday." : "Resets on the 1st of each month."}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={creating || !title.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
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
          <p className="text-sm text-[var(--destructive)]">{createError}</p>
        )}
      </form>
    </div>
  );
}

function ConfettiBurst() {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; color: string; rot: number; scale: number; speed: number }>>([]);

  useEffect(() => {
    const colors = ["var(--accent)", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];
    const newParticles = [];
    for (let i = 0; i < 35; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 30 + Math.random() * 140;
      newParticles.push({
        id: i,
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance - 20,
        color: colors[Math.random() * colors.length | 0],
        rot: Math.random() * 360 + 180,
        scale: 0.5 + Math.random() * 0.7,
        speed: 0.8 + Math.random() * 0.6,
      });
    }
    setParticles(newParticles);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center overflow-visible">
      <style>{`
        @keyframes confettiBurstAnim {
          0% {
            transform: translate(0, 0) rotate(0deg) scale(0);
            opacity: 1;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translate(var(--tx), var(--ty)) rotate(var(--rot)) scale(var(--scale));
            opacity: 0;
          }
        }
      `}</style>
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute w-2.5 h-2.5 rounded-sm"
          style={{
            backgroundColor: p.color,
            ["--tx" as string]: `${p.x}px`,
            ["--ty" as string]: `${p.y}px`,
            ["--rot" as string]: `${p.rot}deg`,
            ["--scale" as string]: p.scale,
            animation: `confettiBurstAnim ${p.speed}s cubic-bezier(0.25, 1, 0.5, 1) forwards`,
          }}
        />
      ))}
    </div>
  );
}
