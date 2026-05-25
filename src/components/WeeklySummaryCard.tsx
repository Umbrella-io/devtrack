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
    thisWeek: { opened: number; merged: number };
    lastWeek: { opened: number; merged: number };
  };
  activeDays: { thisWeek: number; lastWeek: number };
  streak: number;
  topRepo: string | null;
}

export default function WeeklySummaryCard() {
  const [summary, setSummary] = useState<WeeklySummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const maxCommits = summary ? Math.max(summary.commits.current, summary.commits.previous, 1) : 1;
  const maxPRs = summary ? Math.max(summary.prs.thisWeek.merged, summary.prs.lastWeek.merged, 1) : 1;
  const maxActiveDays = summary ? Math.max(summary.activeDays.thisWeek, summary.activeDays.lastWeek, 1) : 1;

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
          <div className="mt-4 space-y-4">
            {/* Commits Comparison */}
            <div className="rounded-lg bg-[var(--control)] p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-[var(--muted-foreground)]">
                  Commits
                </span>
                <span className="text-base font-semibold text-[var(--card-foreground)]">
                  {summary.commits.current}
                  {summary.commits.trend !== "same" && (
                    <span
                      className="ml-2 text-sm font-medium"
                      style={{
                        color: summary.commits.trend === "up" ? "var(--success)" : "var(--destructive)",
                      }}
                    >
                      {summary.commits.trend === "up" ? "+" : "-"}
                      {Math.abs(summary.commits.delta)}
                    </span>
                  )}
                </span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-16 text-xs text-[var(--muted-foreground)]">Last week</span>
                  <div className="flex-1">
                    <div className="h-2 rounded bg-[var(--border)] overflow-hidden">
                      <div
                        className="h-full bg-[var(--muted-foreground)]"
                        style={{
                          width: `${((summary.commits.previous / maxCommits) * 100).toFixed(0)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="w-10 text-right text-xs font-medium text-[var(--card-foreground)]">
                    {((summary.commits.previous / (summary.commits.current + summary.commits.previous || 1)) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-16 text-xs text-[var(--muted-foreground)]">This week</span>
                  <div className="flex-1">
                    <div className="h-2 rounded bg-[var(--border)] overflow-hidden">
                      <div
                        className="h-full bg-[var(--success)]"
                        style={{
                          width: `${((summary.commits.current / maxCommits) * 100).toFixed(0)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="w-10 text-right text-xs font-medium text-[var(--card-foreground)]">
                    {((summary.commits.current / (summary.commits.current + summary.commits.previous || 1)) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>

            {/* PRs Comparison */}
            <div className="rounded-lg bg-[var(--control)] p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-[var(--muted-foreground)]">PRs Merged</span>
                <span className="text-base font-semibold text-[var(--card-foreground)]">
                  {summary.prs.thisWeek.merged}
                </span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-16 text-xs text-[var(--muted-foreground)]">Last week</span>
                  <div className="flex-1">
                    <div className="h-2 rounded bg-[var(--border)] overflow-hidden">
                      <div
                        className="h-full bg-[var(--muted-foreground)]"
                        style={{
                          width: `${((summary.prs.lastWeek.merged / maxPRs) * 100).toFixed(0)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="w-10 text-right text-xs font-medium text-[var(--card-foreground)]">
                    {((summary.prs.lastWeek.merged / (summary.prs.thisWeek.merged + summary.prs.lastWeek.merged || 1)) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-16 text-xs text-[var(--muted-foreground)]">This week</span>
                  <div className="flex-1">
                    <div className="h-2 rounded bg-[var(--border)] overflow-hidden">
                      <div
                        className="h-full bg-[var(--success)]"
                        style={{
                          width: `${((summary.prs.thisWeek.merged / maxPRs) * 100).toFixed(0)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="w-10 text-right text-xs font-medium text-[var(--card-foreground)]">
                    {((summary.prs.thisWeek.merged / (summary.prs.thisWeek.merged + summary.prs.lastWeek.merged || 1)) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Active Days Comparison */}
            <div className="rounded-lg bg-[var(--control)] p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-[var(--muted-foreground)]">Active Days</span>
                <span className="text-base font-semibold text-[var(--card-foreground)]">
                  {summary.activeDays.thisWeek} / 7
                </span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-16 text-xs text-[var(--muted-foreground)]">Last week</span>
                  <div className="flex-1">
                    <div className="h-2 rounded bg-[var(--border)] overflow-hidden">
                      <div
                        className="h-full bg-[var(--muted-foreground)]"
                        style={{
                          width: `${((summary.activeDays.lastWeek / maxActiveDays) * 100).toFixed(0)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="w-10 text-right text-xs font-medium text-[var(--card-foreground)]">
                    {((summary.activeDays.lastWeek / (summary.activeDays.thisWeek + summary.activeDays.lastWeek || 1)) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-16 text-xs text-[var(--muted-foreground)]">This week</span>
                  <div className="flex-1">
                    <div className="h-2 rounded bg-[var(--border)] overflow-hidden">
                      <div
                        className="h-full bg-[var(--success)]"
                        style={{
                          width: `${((summary.activeDays.thisWeek / maxActiveDays) * 100).toFixed(0)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="w-10 text-right text-xs font-medium text-[var(--card-foreground)]">
                    {((summary.activeDays.thisWeek / (summary.activeDays.thisWeek + summary.activeDays.lastWeek || 1)) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Streak & Top Repo */}
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-[var(--control)] p-4">
                <span className="text-sm text-[var(--muted-foreground)]">Streak</span>
                <span className="text-base font-semibold text-[var(--card-foreground)]">
                  {summary.streak} day streak
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-[var(--control)] p-4">
                <span className="text-sm text-[var(--muted-foreground)]">Top repo</span>
                <span className="text-base font-semibold text-[var(--card-foreground)]">
                  {summary.topRepo ?? "-"}
                </span>
              </div>
            </div>
          </div>
        ) : null)}
    </div>
  );
}
