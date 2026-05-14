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

  useEffect(() => {
    fetch("/api/goals")
      .then((r) => r.json())
      .then((data: { goals: Goal[] }) => setGoals(data.goals ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
    </div>
  );
}
