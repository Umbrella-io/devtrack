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
    <div className="bg-slate-800 rounded-xl p-6">
      <div className="h-6 w-36 bg-slate-700 rounded animate-pulse mb-4" />

      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-slate-700 rounded-lg h-28 animate-pulse"
          />
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
    <div className="bg-slate-800 rounded-xl p-6">
      <h2 className="text-white font-semibold text-lg mb-4">Commit Streaks</h2>
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-lg p-4 text-center ${
              stat.highlight
                ? "bg-indigo-500/20 border border-indigo-500/40"
                : "bg-slate-700"
            }`}
          >
            <div className="text-xl mb-1">{stat.icon}</div>
            <div
              className={`text-2xl font-bold ${
                stat.highlight ? "text-indigo-300" : "text-indigo-400"
              }`}
            >
              {stat.value}
              {stat.unit && (
                <span className="text-sm font-normal text-slate-400 ml-1">
                  {stat.unit}
                </span>
              )}
            </div>
            <div className="text-slate-400 text-xs mt-1">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
