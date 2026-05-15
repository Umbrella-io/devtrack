"use client";

import { useEffect, useState } from "react";

interface WeeklySummaryData {
  commits: { current: number | null; last: number | null; delta: number | null };
  pullRequests: { opened: number | null; merged: number | null };
  activeDays: number | null;
  streak: number | null;
  mostActiveRepo: string | null;
  weekStart: string;
  generatedAt: string;
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) {
    return (
      <span className="text-sm font-medium text-[var(--muted-foreground)]">
        —
      </span>
    );
  }

  if (delta > 0) {
    return <span className="text-sm font-medium text-green-500">↑ {delta}</span>;
  }

  if (delta < 0) {
    return (
      <span className="text-sm font-medium text-red-400">
        ↓ {Math.abs(delta)}
      </span>
    );
  }

  return (
    <span className="text-sm font-medium text-[var(--muted-foreground)]">
      0
    </span>
  );
}

function formatRepoName(repo: string | null): string {
  if (!repo) return "—";
  return repo.split("/")[1] ?? repo;
}

export default function WeeklySummaryCard() {
  const [data, setData] = useState<WeeklySummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("weekly-summary-collapsed");
    if (stored !== null) {
      setIsCollapsed(stored === "true");
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    fetch("/api/metrics/weekly-summary")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch weekly summary");
        }

        return response.json();
      })
      .then((summary: WeeklySummaryData) => {
        setData(summary);
        setError(false);
      })
      .catch(() => {
        setError(true);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const toggleCollapsed = () => {
    const nextValue = !isCollapsed;
    setIsCollapsed(nextValue);
    window.localStorage.setItem(
      "weekly-summary-collapsed",
      String(nextValue)
    );
  };

  const showCollapsed = isHydrated && !isLoading && isCollapsed;

  return (
    <div className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
      <button
        type="button"
        onClick={toggleCollapsed}
        className="flex w-full items-center justify-between text-left"
        aria-expanded={!showCollapsed}
        aria-label="Toggle weekly summary"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg" role="img" aria-label="Calendar">
            📅
          </span>
          <h2 className="text-lg font-semibold text-[var(--card-foreground)]">
            This Week
          </h2>
        </div>
        <span className="text-sm text-[var(--muted-foreground)]">
          {showCollapsed ? "v" : "^"}
        </span>
      </button>

      {showCollapsed ? null : isLoading ? (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="rounded-lg bg-[var(--control)] p-4 text-center"
            >
              <div className="mx-auto mb-3 h-4 w-20 rounded bg-[var(--card-muted)] animate-pulse" />
              <div className="mx-auto h-8 w-24 rounded bg-[var(--card-muted)] animate-pulse" />
            </div>
          ))}
        </div>
      ) : error ? (
        <p className="mt-4 text-sm text-[var(--muted-foreground)]">
          Unable to load weekly stats
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-[var(--control)] p-4 text-center">
            <div className="text-sm text-[var(--muted-foreground)]">Commits</div>
            <div className="mt-2 text-2xl font-bold text-[var(--accent)]">
              {data?.commits.current ?? "—"}
            </div>
            <div className="mt-1">
              <DeltaBadge delta={data?.commits.delta ?? null} />
            </div>
          </div>
          <div className="rounded-lg bg-[var(--control)] p-4 text-center">
            <div className="text-sm text-[var(--muted-foreground)]">PRs Open</div>
            <div className="mt-2 text-2xl font-bold text-[var(--accent)]">
              {data?.pullRequests.opened ?? "—"}
            </div>
          </div>
          <div className="rounded-lg bg-[var(--control)] p-4 text-center">
            <div className="text-sm text-[var(--muted-foreground)]">PRs Merged</div>
            <div className="mt-2 text-2xl font-bold text-[var(--accent)]">
              {data?.pullRequests.merged ?? "—"}
            </div>
          </div>
          <div className="rounded-lg bg-[var(--control)] p-4 text-center">
            <div className="text-sm text-[var(--muted-foreground)]">Active Days</div>
            <div className="mt-2 text-2xl font-bold text-[var(--accent)]">
              {data?.activeDays !== null && data?.activeDays !== undefined
                ? `${data.activeDays} / 7`
                : "— / 7"}
            </div>
          </div>
          <div className="rounded-lg bg-[var(--control)] p-4 text-center">
            <div className="text-sm text-[var(--muted-foreground)]">Streak</div>
            <div className="mt-2 text-2xl font-bold text-[var(--accent)]">
              {data?.streak !== null && data?.streak !== undefined
                ? `${data.streak} days`
                : "—"}
            </div>
          </div>
          <div className="rounded-lg bg-[var(--control)] p-4 text-center">
            <div className="text-sm text-[var(--muted-foreground)]">Top Repo</div>
            <div className="mt-2 truncate text-2xl font-bold text-[var(--accent)]">
              {formatRepoName(data?.mostActiveRepo ?? null)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
