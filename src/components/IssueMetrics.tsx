"use client";

import { useEffect, useState } from "react";

interface IssueData {
  opened: number;
  closed: number;
  currentlyOpen: number;
  avgCloseTimeDays: number;
  trend: number;
  mostActiveRepo: string | null;
}

export default function IssueMetrics() {
  const [metrics, setMetrics] = useState<IssueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = () => {
    setLoading(true);
    setError(null);

    fetch("/api/metrics/issues")
      .then((r) => r.json())
      .then((data: IssueData) => setMetrics(data))
      .catch(() =>
        setError(
          "We couldn't load your Issues analytics right now. Please try again in a moment."
        )
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const stats = metrics
    ? [
        { label: "Issues Opened (30d)", value: metrics.opened },
        { label: "Issues Closed (30d)", value: metrics.closed },
        { label: "Currently Open", value: metrics.currentlyOpen },
        { label: "Avg Close Time", value: `${metrics.avgCloseTimeDays}d` },
        { label: "Most Active Repo", value: metrics.mostActiveRepo ?? "—" },
      ]
    : [];

  const trendLabel =
    metrics && metrics.trend !== 0
      ? metrics.trend > 0
        ? `↑ ${metrics.trend} more than last month`
        : `↓ ${Math.abs(metrics.trend)} fewer than last month`
      : null;

  const trendColor =
    metrics && metrics.trend > 0 ? "text-green-400" : "text-red-400";

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-[var(--card-foreground)]">
        Issue Analytics
      </h2>
      {loading ? (
        <div
          role="status"
          aria-live="polite"
          aria-busy="true"
          className="grid grid-cols-2 md:grid-cols-5 gap-4"
        >
          <span className="sr-only">Loading issue analytics</span>
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              aria-hidden="true"
              className="h-20 rounded-lg bg-[var(--card-muted)] p-4 animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          <p>{error}</p>
          <button
            type="button"
            onClick={fetchMetrics}
            className="mt-3 rounded-md border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/10"
          >
            Try again
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {stats.map((stat, idx) => (
            <div
              key={stat.label}
              className="rounded-lg bg-[var(--control)] p-4 text-center"
            >
              <div className="text-2xl font-bold text-[var(--accent)] truncate" title={String(stat.value)}>
                {stat.value}
              </div>
              <div className="mt-1 text-sm text-[var(--muted-foreground)]">
                {stat.label}
              </div>
              {idx === 0 && trendLabel && (
                <div className={`mt-1 text-xs font-medium ${trendColor}`}>
                  {trendLabel}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
