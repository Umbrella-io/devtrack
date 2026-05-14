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
    <div className="bg-slate-800 rounded-xl p-6 h-full">
      <div className="h-6 w-32 bg-slate-700 rounded animate-pulse mb-4" />

      {[1, 2, 3].map((i) => (
        <div key={i} className="mb-4">
          <div className="h-4 bg-slate-700 rounded animate-pulse mb-2" />
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
            return (
              <li key={goal.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-300">{goal.label}</span>
                  <span className="text-slate-400">
                    {goal.current}/{goal.target}
                  </span>
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
