"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount } from "@/components/AccountContext";
import PRStatusDonutChart from "./PRStatusDonutChart";

interface PRMetricsSummary {
  open: number;
  merged: number;
  closed: number;
  avgReviewHours: number;
  avgFirstReviewHours: number | null;
  mergeRate: string;
}

interface PRData extends PRMetricsSummary {
  gitlab?: PRMetricsSummary;
}

function formatReviewCycle(hours: number | null): string {
  if (hours === null) {
    return "—";
  }

  if (hours < 24) {
    return `${hours}h`;
  }

  return `${Math.round((hours / 24) * 10) / 10}d`;
}

export default function PRMetrics() {
  const { selectedAccount } = useAccount();
  const [metrics, setMetrics] = useState<PRData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [minutesAgo, setMinutesAgo] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(() => {
    setLoading(true);
    setError(null);

    const url =
      selectedAccount !== null
        ? `/api/metrics/prs?accountId=${encodeURIComponent(selectedAccount)}`
        : "/api/metrics/prs";

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error("API error");
        return r.json();
      })
      .then((data: PRData) => {
        setMetrics(data);
        setLastUpdated(new Date());
        setMinutesAgo(0);
      })
      .catch(() => setError("We couldn't load your PR analytics right now. Please try again in a moment."))
      .finally(() => setLoading(false));
  }, [selectedAccount]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    if (!lastUpdated) {
      return;
    }

    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - lastUpdated.getTime()) / 60000);
      setMinutesAgo(diff);
    }, 60000);

    return () => clearInterval(interval);
  }, [lastUpdated]);

  const buildStats = (
    source: PRMetricsSummary,
    labels: {
      open: string;
      merged: string;
      avgReview: string;
      avgFirstReview: string;
      mergeRate: string;
    }
  ) => [
    { label: labels.open, value: source.open },
    { label: labels.merged, value: source.merged },
    { label: labels.avgReview, value: `${source.avgReviewHours}h` },
    {
      label: labels.avgFirstReview,
      value: formatReviewCycle(source.avgFirstReviewHours),
      title: "Average time from PR open to first review comment or approval",
    },
    { label: labels.mergeRate, value: source.mergeRate },
  ];

  const githubStats = metrics
    ? buildStats(metrics, {
        open: "Open PRs",
        merged: "Merged (30d)",
        avgReview: "Avg Review Time",
        avgFirstReview: "Avg First Review",
        mergeRate: "Merge Rate",
      })
    : [];

  const gitlabStats = metrics?.gitlab
    ? buildStats(metrics.gitlab, {
        open: "Open MRs",
        merged: "Merged (30d)",
        avgReview: "Avg Review Time",
        avgFirstReview: "Avg First Review",
        mergeRate: "Merge Rate",
      })
    : [];

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-[var(--card-foreground)]">PR Analytics</h2>
      {loading ? (
        <div
          role="status"
          aria-live="polite"
          aria-busy="true"
          className="space-y-4"
        >
          <span className="sr-only">Loading PR analytics</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                aria-hidden="true"
                className="bg-[var(--card-muted)] rounded-lg p-4 h-24 animate-pulse"
              />
            ))}
          </div>
          <div className="h-[270px] rounded-lg bg-[var(--card-muted)] animate-pulse" aria-hidden="true" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-[var(--destructive)]/20 bg-[var(--destructive)]/10 p-4 text-sm text-[var(--destructive)]">
          <p>{error}</p>
          <button
            type="button"
            onClick={fetchMetrics}
            className="mt-3 rounded-md border border-[var(--destructive)]/30 px-3 py-1.5 text-xs font-medium text-[var(--destructive)] transition-colors hover:bg-[var(--destructive)]/10"
          >
            Try again
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stat grid */}
          <div>
            <p className="text-sm font-medium text-[var(--muted-foreground)]">GitHub PRs</p>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {githubStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-lg bg-[var(--control)] p-4 text-center min-w-0"
                  title={stat.title}
                >
                  <div className="truncate text-2xl font-bold text-[var(--accent)]">
                    {stat.value}
                  </div>
                  <div className="truncate mt-1 text-sm text-[var(--muted-foreground)]">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* PR status donut chart */}
          {metrics && (
            <div>
              <p className="mb-2 text-sm font-medium text-[var(--muted-foreground)]">
                PR Status Distribution
              </p>
              <PRStatusDonutChart
                open={metrics.open}
                merged={metrics.merged}
                closed={metrics.closed}
              />
            </div>
          )}

          {metrics?.gitlab && (
            <div className="space-y-4 border-t border-[var(--border)] pt-4">
              <p className="text-sm font-medium text-[var(--muted-foreground)]">GitLab MRs</p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {gitlabStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-lg bg-[var(--control)] p-4 text-center min-w-0"
                    title={stat.title}
                  >
                    <div className="truncate text-2xl font-bold text-[var(--accent)]">
                      {stat.value}
                    </div>
                    <div className="truncate mt-1 text-sm text-[var(--muted-foreground)]">{stat.label}</div>
                  </div>
                ))}
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-[var(--muted-foreground)]">
                  MR Status Distribution
                </p>
                <PRStatusDonutChart
                  open={metrics.gitlab.open}
                  merged={metrics.gitlab.merged}
                  closed={metrics.gitlab.closed}
                />
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
