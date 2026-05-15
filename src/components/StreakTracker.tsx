"use client";

import { useEffect, useState } from "react";

interface StreakData {
  current: number;
  longest: number;
  lastCommitDate: string | null;
  totalActiveDays: number;
}

interface FreezeData {
  hasFreeze: boolean;
  freezeDate: string | null;
}

export default function StreakTracker() {
  const [data, setData] = useState<StreakData | null>(null);
  const [freeze, setFreeze] = useState<FreezeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [freezeLoading, setFreezeLoading] = useState(false);
  const [freezeError, setFreezeError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/metrics/streak").then((r) => r.json()),
      fetch("/api/streak/freeze").then((r) => r.json()),
    ])
      .then(([streakData, freezeData]: [StreakData, FreezeData]) => {
        setData(streakData);
        setFreeze(freezeData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleUseFreeze() {
    setFreezeLoading(true);
    setFreezeError(null);
    try {
      const res = await fetch("/api/streak/freeze", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setFreezeError(json.error ?? "Failed to apply freeze.");
      } else {
        const [streakData, freezeData]: [StreakData, FreezeData] =
          await Promise.all([
            fetch("/api/metrics/streak").then((r) => r.json()),
            fetch("/api/streak/freeze").then((r) => r.json()),
          ]);
        setData(streakData);
        setFreeze(freezeData);
      }
    } catch {
      setFreezeError("Something went wrong. Please try again.");
    } finally {
      setFreezeLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
        <div className="mb-4 h-5 w-36 rounded bg-[var(--card-muted)] animate-pulse" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-[var(--card-muted)] animate-pulse" />
          ))}
        </div>
        <div className="mt-4 h-10 rounded-lg bg-[var(--card-muted)] animate-pulse" />
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

      {/* ── Streak Freeze Section ── */}
      <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--control)] p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🧊</span>
            <div>
              <p className="text-sm font-medium text-[var(--card-foreground)]">
                Streak Freeze
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">
                {freeze?.hasFreeze
                  ? `Freeze active for ${freeze.freezeDate}`
                  : "No freeze active — protect today's streak"}
              </p>
            </div>
          </div>
          {!freeze?.hasFreeze && (
            <button
              onClick={handleUseFreeze}
              disabled={freezeLoading}
              className="shrink-0 rounded-lg border border-[var(--accent)]/40 bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-medium text-[var(--accent)] transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {freezeLoading ? "Applying…" : "Use Freeze"}
            </button>
          )}
          {freeze?.hasFreeze && (
            <span className="shrink-0 rounded-lg bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-medium text-[var(--accent)]">
              ✓ Active
            </span>
          )}
        </div>
        {freezeError && (
          <p className="mt-2 text-xs text-red-500">{freezeError}</p>
        )}
      </div>
    </div>
  );
}
