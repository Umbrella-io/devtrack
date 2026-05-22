"use client";

import { useEffect, useState } from "react";

interface WeeklySummaryData {
  commits: {
    current: number;
    previous: number;
    delta: number;
    trend: "up" | "down" | "same";
  };
  prs: {
    opened: number;
    merged: number;
  };
  activeDays: number;
  streak: number;
  topRepo: string | null;
}

export default function WeeklySummaryCard() {
  const [summary, setSummary] = useState<WeeklySummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch("/api/metrics/weekly-summary")
      .then((r) => {
        if (!r.ok) throw new Error("API error");
        return r.json();
      })
      .then((data: WeeklySummaryData) => setSummary(data))
      .catch(() =>
        setError(
          "We couldn't load your weekly summary right now. Please try again in a moment."
        )
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--card-foreground)]">
          This Week
        </h2>
        <button
          type="button"
          onClick={() => setIsCollapsed((value) => !value)}
          className="text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--card-foreground)]"
          aria-expanded={!isCollapsed}
          aria-label={
            isCollapsed ? "Expand weekly summary" : "Collapse weekly summary"
          }
        >
          {isCollapsed ? ">" : "v"}
        </button>
      </div>

      {!isCollapsed &&
        (loading ? (
          <div
            role="status"
            aria-live="polite"
            aria-busy="true"
            className="mt-4 space-y-3"
          >
            <span className="sr-only">Loading weekly summary</span>
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                aria-hidden="true"
                className="h-14 rounded-lg bg-[var(--card-muted)] animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          <div className="mt-4 rounded-lg border border-[var(--destructive)]/20 bg-[var(--destructive)]/10 p-4 text-sm text-[var(--destructive)]">
            {error}
          </div>
        ) : summary ? (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-[var(--control)] p-4">
              <span className="text-sm text-[var(--muted-foreground)]">
                Commits
              </span>
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold text-[var(--card-foreground)]">
                  {summary.commits.current}
                </span>
                {summary.commits.trend === "up" && (
                  <span className="text-sm font-medium text-[var(--success)]">
                    + {summary.commits.delta}
                  </span>
                )}
                {summary.commits.trend === "down" && (
                  <span className="text-sm font-medium text-[var(--destructive)]">
                    - {Math.abs(summary.commits.delta)}
                  </span>
                )}
                {summary.commits.trend === "same" && (
                  <span className="text-sm font-medium text-[var(--muted-foreground)]">
                    0
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-[var(--control)] p-4">
              <span className="text-sm text-[var(--muted-foreground)]">PRs</span>
              <span className="text-base font-semibold text-[var(--card-foreground)]">
                {summary.prs.opened} opened / {summary.prs.merged} merged
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-[var(--control)] p-4">
              <span className="text-sm text-[var(--muted-foreground)]">
                Active days
              </span>
              <span className="text-base font-semibold text-[var(--card-foreground)]">
                {summary.activeDays} / 7 days
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-[var(--control)] p-4">
              <span className="text-sm text-[var(--muted-foreground)]">
                Streak
              </span>
              <span className="text-base font-semibold text-[var(--card-foreground)]">
                {summary.streak} day streak
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-[var(--control)] p-4">
              <span className="text-sm text-[var(--muted-foreground)]">
                Top repo
              </span>
              <span className="text-base font-semibold text-[var(--card-foreground)]">
                {summary.topRepo ?? "-"}
              </span>
            </div>
          </div>
        ) : null)}
    </div>
  );
}
