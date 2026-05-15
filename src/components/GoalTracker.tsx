"use client";

import { useEffect, useState } from "react";

interface Goal {
  id: string;
  label: string;
  target: number;
  current: number;
}

export default function GoalTracker() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  // Track which goal is awaiting delete confirmation
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  // Track which goal is currently being deleted (API in-flight)
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/goals")
      .then((r) => r.json())
      .then((data: { goals: Goal[] }) => setGoals(data.goals ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    // Optimistic update: remove goal immediately
    const previousGoals = goals;
    setGoals((prev) => prev.filter((g) => g.id !== id));
    setConfirmingId(null);
    setDeletingId(id);

    try {
      const res = await fetch(`/api/goals/${id}`, { method: "DELETE" });
      if (!res.ok) {
        // Restore on failure
        setGoals(previousGoals);
      }
    } catch {
      // Restore on network error
      setGoals(previousGoals);
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-xl p-6 h-full">
        <div className="h-5 w-32 bg-slate-700 rounded animate-pulse mb-4" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="mb-4">
            <div className="h-3 bg-slate-700 rounded animate-pulse mb-2" />
            <div className="h-2 bg-slate-700 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-xl p-6 h-full">
      <h2 className="text-white font-semibold text-lg mb-4">Weekly Goals</h2>
      {goals.length === 0 ? (
        <p className="text-slate-400 text-sm">
          No goals yet. Create one via the API or future UI.
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
                  <span className="text-slate-300">{goal.label}</span>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">
                      {goal.current}/{goal.target}
                    </span>

                    {/* Delete / Confirm UI */}
                    {isConfirming ? (
                      <span className="flex items-center gap-1 text-xs">
                        <span className="text-slate-400">Delete?</span>
                        <button
                          onClick={() => handleDelete(goal.id)}
                          disabled={isDeleting}
                          className="text-red-400 hover:text-red-300 font-semibold transition-colors disabled:opacity-50"
                          aria-label={`Confirm delete goal: ${goal.label}`}
                        >
                          Yes
                        </button>
                        <span className="text-slate-600">/</span>
                        <button
                          onClick={() => setConfirmingId(null)}
                          className="text-slate-400 hover:text-slate-200 transition-colors"
                          aria-label="Cancel delete"
                        >
                          No
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmingId(goal.id)}
                        disabled={isDeleting}
                        className="text-slate-500 hover:text-red-400 transition-colors disabled:opacity-50"
                        aria-label={`Delete goal: ${goal.label}`}
                        title="Delete goal"
                      >
                        {/* Trash icon (inline SVG, no extra dependency) */}
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

                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
