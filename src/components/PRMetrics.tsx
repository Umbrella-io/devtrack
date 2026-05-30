"use client";

import { useEffect, useState } from "react";

interface PRData {
  open: number;
  merged: number;
  avgReviewHours: number;
  mergeRate: string;
}

export default function PRMetrics() {
  const [metrics, setMetrics] = useState<PRData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = () => {
    setLoading(true);
    setError(null);

    fetch("/api/metrics/prs")
      .then((r) => r.json())
      .then((data: PRData) => setMetrics(data))
      .catch(() =>
        setError(
          "We couldn't load your PR analytics right now. Please try again in a moment."
        )
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const stats = metrics
    ? [
        { label: "Open PRs", value: metrics.open, description: `${metrics.open} open pull requests` },
        { label: "Merged (30d)", value: metrics.merged, description: `${metrics.merged} pull requests merged in the last 30 days` },
        { label: "Avg Review Time", value: `${metrics.avgReviewHours}h`, description: `Average review time of ${metrics.avgReviewHours} hours` },
        { label: "Merge Rate", value: metrics.mergeRate, description: `Merge rate of ${metrics.mergeRate}` },
      ]
    : [];

  return (
    <section
      aria-labelledby="pr-analytics-heading"
      className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm"
    >
      <h2
        id="pr-analytics-heading"
        className="mb-4 text-lg font-semibold text-[var(--card-foreground)]"
      >
        PR Analytics
      </h2>

      {loading ? (
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
          role="status"
          aria-label="Loading PR analytics"
        >
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-20 rounded-lg bg-[var(--card-muted)] p-4 animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={fetchMetrics}
            aria-label="Retry loading PR analytics"
            className="mt-3 rounded-md border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/10"
          >
            Try again
          </button>
        </div>
      ) : (
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg bg-[var(--control)] p-4 text-center"
            >
              <dt className="mt-1 text-sm text-[var(--muted-foreground)]">
                {stat.label}
              </dt>
              <dd
                className="text-2xl font-bold text-[var(--accent)]"
                aria-label={stat.description}
              >
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}