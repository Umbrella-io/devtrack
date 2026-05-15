"use client";

import { useCallback, useEffect, useState } from "react";
import Toast from "./Toast";

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
  const [createError, setCreateError] = useState<string | null>(null);

  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState("");
  const [notifiedGoals, setNotifiedGoals] = useState<string[]>([]);

  const loadGoals = useCallback(async () => {
    const response = await fetch("/api/goals");
    const data: { goals: Goal[] } = await response.json();
    setGoals(data.goals ?? []);
  }, []);

  useEffect(() => {
    loadGoals()
      .catch(() => { })
      .finally(() => setLoading(false));
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
        throw new Error();
      }
    } catch {
      setCreateError("Failed to create goal. Please try again.");
      setCreating(false);
      return;
    }

    setLabel("");
    setTarget(7);

    await loadGoals().catch(() => { });

    setCreating(false);
  }

  async function handleDelete(id: string) {
    const previousGoals = goals;

    setGoals((prev) => prev.filter((g) => g.id !== id));

    setConfirmingId(null);
    setDeletingId(id);

    try {
      const response = await fetch(`/api/goals/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        setGoals(previousGoals);
      }
    } catch {
      setGoals(previousGoals);
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    goals.forEach((goal) => {
      const isComplete = goal.current >= goal.target;
      const alreadyNotified = notifiedGoals.includes(goal.id);

      if (isComplete && !alreadyNotified) {
        setToastMessage(`🎉 Goal complete: ${goal.label}!`);
        setNotifiedGoals((prev) => [...prev, goal.id]);
      }
    });
  }, [goals, notifiedGoals]);

  if (loading) {
    return (
      <div className="h-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <div className="mb-4 h-5 w-32 rounded bg-[var(--card-muted)] animate-pulse" />
      </div>
    );
  }

  return (
    <>
      {toastMessage && (
        <Toast
          message={toastMessage}
          onClose={() => setToastMessage("")}
        />
      )}

      <div className="h-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-[var(--card-foreground)]">
          Weekly Goals
        </h2>

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

              return (
                <li key={goal.id}>
                  <div className="flex justify-between items-center text-sm mb-1">
                    <span>{goal.label}</span>

                    <div className="flex items-center gap-2">
                      <span>
                        {goal.current}/{goal.target}
                      </span>

                      {isConfirming ? (
                        <span className="flex items-center gap-1 text-xs">
                          <span>Delete?</span>

                          <button
                            onClick={() => handleDelete(goal.id)}
                            disabled={isDeleting}
                          >
                            Yes
                          </button>

                          <span>/</span>

                          <button
                            onClick={() => setConfirmingId(null)}
                          >
                            No
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setConfirmingId(goal.id)}
                          disabled={isDeleting}
                          aria-label={`Delete goal: ${goal.label}`}
                        >
                          🗑️
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

        <form
          onSubmit={handleCreate}
          className="mt-6 space-y-3 border-t border-[var(--border)] pt-4"
        >
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Commit every day"
            required
            disabled={creating}
          />

          <input
            type="number"
            min={1}
            value={target}
            onChange={(e) => setTarget(Number(e.target.value))}
            disabled={creating}
          />

          <button
            type="submit"
            disabled={creating || !label.trim()}
          >
            {creating ? "Creating..." : "Add goal"}
          </button>

          {createError && (
            <p>{createError}</p>
          )}
        </form>
      </div>
    </>
  );
}