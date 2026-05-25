"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useAccount } from "@/components/AccountContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Percent } from "lucide-react";
import PRStatusDonutChart from "./PRStatusDonutChart";

interface PRData {
  open: number;
  merged: number;
  closed: number;
  avgReviewHours: number;
  avgFirstReviewHours: number | null;
  mergeRate: string;
  reviewsGiven: number;
  reviewRatio: number;
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
      .catch(() => setError("We couldn't load your PR analytics right now. Please try again in a moment."))
      .finally(() => setLoading(false));
  }, [selectedAccount]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {stats.map((stat) => (
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

          {/* Review Participation Metrics Section */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-[var(--control)] border-[var(--border)] text-[var(--card-foreground)]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-[var(--card-foreground)]">Reviews Given (Last 30 Days)</CardTitle>
                <Eye className="h-4 w-4 text-[var(--muted-foreground)]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.reviewsGiven ?? 0}</div>
                <p className="text-xs text-[var(--muted-foreground)]">Total pull request reviews submitted</p>
              </CardContent>
            </Card>

            <Card className="bg-[var(--control)] border-[var(--border)] text-[var(--card-foreground)]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-[var(--card-foreground)]">Review Participation Ratio</CardTitle>
                <Percent className="h-4 w-4 text-[var(--muted-foreground)]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.reviewRatio ?? 0}x</div>
                <p className="text-xs text-[var(--muted-foreground)]">Reviews submitted per authored PR</p>
              </CardContent>
            </Card>
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
        </div>
      )}
    </div>
  );
}