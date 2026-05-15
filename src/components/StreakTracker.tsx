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
  const [copied, setCopied] = useState(false); 

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

    const handleCopy = () => {
    if (!data) return;

    // Using an array guarantees the exact format with zero indentation errors
    const textToCopy = [
      "🔥 DevTrack Stats",
      `Current streak: ${data.current} days`,
      `Longest streak: ${data.longest} days`,
      `Active days: ${data.totalActiveDays}`
    ].join('\n');

    if (!navigator.clipboard) {
      console.warn("Clipboard API not supported in this browser.");
      return;
    }

    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch((err) => console.error("Failed to copy stats", err));
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--card-foreground)]">
          Commit Streaks
        </h2>
        {data && (
          <button
            onClick={handleCopy}
            className="flex h-8 items-center justify-center rounded-md px-2 text-sm text-[var(--muted-foreground)] hover:bg-[var(--control)] hover:text-[var(--card-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-colors"
            aria-label="Copy streak stats to clipboard"
            title="Copy stats"
          >
            {copied ? (
              <span className="text-xs font-medium text-green-500">Copied!</span>
            ) : (
              <span className="text-base opacity-80 hover:opacity-100">📋</span>
            )}
          </button>
        )}
      </div>
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
