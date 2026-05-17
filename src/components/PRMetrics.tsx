"use client";

import { useEffect, useState } from "react";

interface PRSourceMetrics {
  open: number;
  merged: number;
  total: number;
  avgReviewHours: number;
  mergeRate: string;
}

interface PRMetricsResponse extends PRSourceMetrics {
  sources?: {
    github?: PRSourceMetrics;
    gitlab?: PRSourceMetrics | null;
  };
}

export default function PRMetrics() {
  const [metrics, setMetrics] = useState<PRMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [minutesAgo, setMinutesAgo] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = () => {
    setLoading(true);
    setError(null);

    fetch("/api/metrics/prs")
      .then((r) => {
        if (!r.ok) throw new Error("API error");
        return r.json();
      })
      .then((data: PRMetricsResponse) => setMetrics(data))
      .catch(() => setError("We couldn't load your PR analytics right now. Please try again in a moment."))
      .finally(() => {
        setLoading(false);
        setLastUpdated(new Date());
        setMinutesAgo(0);
      });
  };

  useEffect(() => {
    fetchMetrics();
  }, []);
  useEffect(() => {
   if (!lastUpdated) return;
   const interval = setInterval(() => {
    const diff = Math.floor((Date.now() - lastUpdated.getTime()) / 60000);
    setMinutesAgo(diff);
  }, 60000);
  return () => clearInterval(interval);
  }, [lastUpdated]);
  const stats = metrics
    ? [
        { label: "Open PRs", value: metrics.open },
        { label: "Merged (30d)", value: metrics.merged },
        { label: "Avg Review Time", value: `${metrics.avgReviewHours}h` },
        { label: "Merge Rate", value: metrics.mergeRate },
      ]
    : [];

  const sourceSections =
    metrics?.sources?.gitlab && metrics.sources.github
      ? [
          { label: "GitHub", metrics: metrics.sources.github },
          { label: "GitLab", metrics: metrics.sources.gitlab },
        ]
      : [];

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-[var(--card-foreground)]">PR Analytics</h2>
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-[var(--card-muted)] rounded-lg p-4 h-24 animate-pulse"
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
        <div className="grid gap-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg bg-[var(--control)] p-4 text-center"
              >
                <div className="text-2xl font-bold text-[var(--accent)]">
                  {stat.value}
                </div>
                <div className="mt-1 text-sm text-[var(--muted-foreground)]">{stat.label}</div>
              </div>
            ))}
          </div>

          {sourceSections.length > 0 && (
            <div className="border-t border-[var(--border)] pt-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)] mb-3">
                Sources
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sourceSections.map((section) => (
                  <div
                    key={section.label}
                    className="rounded-lg bg-[var(--control)] p-4"
                  >
                    <div className="text-sm font-semibold text-[var(--card-foreground)] mb-3">
                      {section.label}
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div>
                        <div className="text-lg font-semibold text-[var(--accent)]">
                          {section.metrics?.open ?? 0}
                        </div>
                        <div className="text-xs text-[var(--muted-foreground)]">Open</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-[var(--accent)]">
                          {section.metrics?.merged ?? 0}
                        </div>
                        <div className="text-xs text-[var(--muted-foreground)]">Merged</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-[var(--accent)]">
                          {section.metrics?.avgReviewHours ?? 0}h
                        </div>
                        <div className="text-xs text-[var(--muted-foreground)]">Avg Review</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-[var(--accent)]">
                          {section.metrics?.mergeRate ?? "0%"}
                        </div>
                        <div className="text-xs text-[var(--muted-foreground)]">Merge Rate</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {lastUpdated && (
        <p className="text-xs text-[var(--muted-foreground)] mt-2 text-right">
          {minutesAgo === 0 ? "Updated just now" : `Updated ${minutesAgo} min ago`}
        </p>
      )}
    </div>
  );
}