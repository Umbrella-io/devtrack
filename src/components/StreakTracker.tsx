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
}

export default function StreakTracker() {
  const [data, setData] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [freeze, setFreeze] = useState<FreezeData | null>(null);
  const [freezeLoading, setFreezeLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const fetchStreak = () => {
    setLoading(true);
    setError(null);

    fetch("/api/metrics/streak")
      .then((r) => r.json())
      .then((d: StreakData) => setData(d))
      .catch(() => setError("We couldn't load your streak data right now. Please try again in a moment."))
      .finally(() => setLoading(false));
  };

  const fetchFreeze = () => {
    setFreezeLoading(true);
    fetch("/api/streak/freeze")
      .then((r) => r.json())
      .then((d: FreezeData) => setFreeze(d))
      .catch(() => setFreeze(null))
      .finally(() => setFreezeLoading(false));
  };

  useEffect(() => {
    fetchStreak();
    fetchFreeze();
  }, []);

  async function handleCancelFreeze() {
    if (!confirmCancel) {
      setConfirmCancel(true);
      return;
    }

    setCancelling(true);
    try {
      const res = await fetch("/api/streak/freeze", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to cancel freeze");

      setConfirmCancel(false);

      // Silently refresh both without triggering loading skeletons
      const [streakRes, freezeRes] = await Promise.all([
        fetch("/api/metrics/streak"),
        fetch("/api/streak/freeze"),
      ]);
      const [streakData, freezeData] = await Promise.all([
        streakRes.json() as Promise<StreakData>,
        freezeRes.json() as Promise<FreezeData>,
      ]);
      setData(streakData);
      setFreeze(freezeData);
    } catch {
      fetchFreeze();
    } finally {
      setCancelling(false);
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
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-[var(--card-foreground)]">Commit Streaks</h2>
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          <p>{error}</p>
          <button
            type="button"
            onClick={fetchStreak}
            className="mt-3 rounded-md border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/10"
          >
            Try again
          </button>
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
          tooltip: "Current consecutive coding days",
        },
        {
          label: "Longest Streak",
          value: data.longest,
          unit: "days",
          highlight: false,
          icon: "🏆",
          tooltip: "Your longest streak ever",
        },
        {
          label: "Active Days (90d)",
          value: data.totalActiveDays,
          unit: "days",
          highlight: false,
          icon: "📅",
          tooltip: "Days you made commits in the last 90 days",
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
          tooltip: "Your most recent commit",
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
            <div className="text-xl mb-1" title={stat.tooltip} aria-label={stat.tooltip} role="img">{stat.icon}</div>
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
      {!freezeLoading && freeze?.hasFreeze && (
        <div className="mt-4 flex items-center justify-between rounded-lg border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-4 py-3">
          <span className="text-sm font-medium text-[var(--accent)]">✓ Freeze active today</span>
          {confirmCancel ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--muted-foreground)]">Remove freeze?</span>
              <button
                type="button"
                onClick={handleCancelFreeze}
                disabled={cancelling}
                className="rounded-md bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400 transition hover:bg-red-500/20 disabled:opacity-60"
              >
                {cancelling ? "Removing..." : "Yes, remove"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmCancel(false)}
                disabled={cancelling}
                className="rounded-md border border-[var(--border)] px-2.5 py-1 text-xs font-medium text-[var(--muted-foreground)] transition hover:bg-[var(--control)]"
              >
                Keep
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleCancelFreeze}
              className="rounded-md border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--muted-foreground)] transition hover:bg-[var(--control)]"
            >
              Cancel freeze
            </button>
          )}
        </div>
      )}
    </div>
  );
}
