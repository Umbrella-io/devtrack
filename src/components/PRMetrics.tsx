"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount } from "@/components/AccountContext";

interface PRData {
  open: number;
  merged: number;
  avgReviewHours: number;
  avgFirstReviewHours: number | null;
  mergeRate: string;
  prs: PullRequest[];
}

interface PullRequest {
  title: string;
  created_at: string;
  html_url: string;
  state: string;
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
  const [error, setError] = useState<string | null>(null);
  const [staleDays, setStaleDays] = useState(7);

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
      .then((data: PRData) => setMetrics(data))
      .catch(() =>
        setError(
          "We couldn't load your PR analytics right now. Please try again in a moment."
        )
      )
      .finally(() => setLoading(false));
  }, [selectedAccount]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const isStale = (createdAt: string) => {
    const createdDate = new Date(createdAt);
    const now = new Date();

    const diffTime = now.getTime() - createdDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    return diffDays > staleDays;
  };

  const stalePRs =
    metrics?.prs.filter(
      (pr) => pr.state === "open" && isStale(pr.created_at)
    ) || [];

  const stats = metrics
    ? [
        { label: "Open PRs", value: metrics.open },
        { label: "Merged (30d)", value: metrics.merged },
        { label: "Avg Review Time", value: `${metrics.avgReviewHours}h` },
        {
          label: "Avg First Review",
          value: formatReviewCycle(metrics.avgFirstReviewHours),
          title: "Average time from PR open to first review comment or approval",
        },
        { label: "Merge Rate", value: metrics.mergeRate },
      ]
    : [];

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-[var(--card-foreground)]">
        PR Analytics
      </h2>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 rounded-lg bg-[var(--card-muted)] p-4 animate-pulse"
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
        <>
          <div className="mb-4 flex items-center justify-between">
            <div className="rounded-full bg-orange-500/10 px-3 py-1 text-sm text-orange-400">
              {stalePRs.length} PRs stale &gt; {staleDays} days
            </div>

            <select
              value={staleDays}
              onChange={(e) => setStaleDays(Number(e.target.value))}
              className="rounded-md border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-sm"
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="min-w-0 rounded-lg bg-[var(--control)] p-4 text-center"
                title={stat.title}
              >
                <div className="truncate text-2xl font-bold text-[var(--accent)]">
                  {stat.value}
                </div>

                <div className="mt-1 truncate text-sm text-[var(--muted-foreground)]">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {stalePRs.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 text-sm font-semibold text-[var(--card-foreground)]">
                Stale Pull Requests
              </h3>

              <div className="space-y-2">
                {stalePRs.map((pr) => (
                  <a
                    key={pr.html_url}
                    href={pr.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-lg bg-[var(--control)] p-3 transition hover:opacity-90"
                  >
                    <span className="text-sm text-[var(--card-foreground)]">
                      {pr.title}
                    </span>

                    <span className="rounded-full bg-orange-500/10 px-2 py-1 text-xs font-medium text-orange-400">
                      Stale
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}