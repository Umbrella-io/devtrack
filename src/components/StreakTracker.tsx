"use client";

import { useEffect, useState } from "react";

interface StreakData {
  current: number;
  longest: number;
  lastCommitDate: string | null;
  totalActiveDays: number;
}

export default function StreakTracker() {
  const [data, setData] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/metrics/streak")
      .then((r) => r.json())
      .then((d: StreakData) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
        <div className="mb-4 h-5 w-36 rounded bg-[var(--card-muted)] animate-pulse" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-[var(--card-muted)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const stats = data
    ? [
        {
          label: "Current Streak",
          value: data.current,
          unit: "days",
          highlight: data.current > 0,
          icon: "🔥",
        },
        {
          label: "Longest Streak",
          value: data.longest,
          unit: "days",
          highlight: false,
          icon: "🏆",
        },
        {
          label: "Active Days (90d)",
          value: data.totalActiveDays,
          unit: "days",
          highlight: false,
          icon: "📅",
        },
        {
          label: "Last Commit",
          value: data.lastCommitDate
            ? new Date(data.lastCommitDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            : "—",
          unit: "",
          highlight: false,
          icon: "⚡",
        },
      ]
    : [];

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-[var(--card-foreground)]">Commit Streaks</h2>
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-lg p-4 text-center ${
              stat.highlight
                ? "border border-[var(--accent)]/40 bg-[var(--accent-soft)]"
                : "bg-[var(--control)]"
            }`}
          >
            <div className="text-xl mb-1">{stat.icon}</div>
            <div
              className={`text-2xl font-bold ${
                stat.highlight ? "text-[var(--accent)]" : "text-[var(--accent)]"
              }`}
            >
              {stat.value}
              {stat.unit && (
                <span className="ml-1 text-sm font-normal text-[var(--muted-foreground)]">
                  {stat.unit}
                </span>
              )}
            </div>
            <div className="mt-1 text-xs text-[var(--muted-foreground)]">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
