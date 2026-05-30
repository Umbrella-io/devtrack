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
  gitlab?: {
    open: number;
    merged: number;
    closed: number;
    avgReviewHours: number;
    mergeRate: string;
  };
}

function formatReviewCycle(hours: number | null): string {
  if (hours === null) return "—";
  if (hours < 24) return `${hours}h`;
  return `${Math.round((hours / 24) * 10) / 10}d`;
}

export default function PRMetrics() {
  const { selectedAccount } = useAccount();
  const [metrics, setMetrics] = useState<PRData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"authored" | "reviews">("authored");
  const [prFilter, setPrFilter] = useState<"all" | "merged" | "open">("all");

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

  // Combined stats calculation mapping metrics for rendering cards cleanly
  const githubStats = metrics
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

  const gitlabStats = metrics?.gitlab
    ? [
        { label: "Open MRs", value: metrics.gitlab.open },
        { label: "Merged MRs", value: metrics.gitlab.merged },
        { label: "Avg Review Time", value: `${metrics.gitlab.avgReviewHours}h` },
        { label: "Merge Rate", value: metrics.gitlab.mergeRate },
      ]
    : [];

  const renderStat = (stat: { label: string; value: string | number; title?: string }) => (
    <div
      key={stat.label}
      className="rounded-lg bg-[var(--control)] p-4 text-center min-w-0 border border-[var(--border)]"
      title={stat.title}
    >
      <div className="truncate text-2xl font-bold text-[var(--accent)]">
        {stat.value}
      </div>
      <div className="truncate mt-1 text-sm text-[var(--muted-foreground)]">{stat.label}</div>
    </div>
  );

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm space-y-6">
      <h2 className="text-lg font-semibold text-[var(--card-foreground)]">PR Analytics</h2>
      
      {loading ? (
        <div role="status" aria-live="polite" aria-busy="true" className="space-y-4">
          <span className="sr-only">Loading PR analytics</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-[var(--card-muted)] rounded-lg p-4 h-24 animate-pulse" />
            ))}
          </div>
          <div className="h-[270px] rounded-lg bg-[var(--card-muted)] animate-pulse" />
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

          <div className="border-t border-[var(--border)] pt-4">
            <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
              <p className="text-sm font-medium text-[var(--muted-foreground)]">GitHub PRs</p>
              <div className="flex items-center gap-2">
                {(["all", "merged", "open"] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setPrFilter(filter)}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition-colors ${
                      prFilter === filter
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--control)] text-[var(--muted-foreground)] hover:bg-[var(--card-muted)]"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {githubStats
                .filter((stat) => {
                  if (prFilter === "all") return true;
                  const lbl = stat.label.toLowerCase();
                  if (prFilter === "open") return lbl.includes("open") || lbl.includes("stale");
                  if (prFilter === "merged") return lbl.includes("merged") || lbl.includes("review") || lbl.includes("merge rate");
                  return true;
                })
                .map(renderStat)}
            </div>
          </div>

          {metrics && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-[var(--muted-foreground)]">
                PR Status Distribution
              </p>
              <PRStatusDonutChart
                open={prFilter === "merged" ? 0 : (metrics.open || 0)}
                merged={prFilter === "open" ? 0 : (metrics.merged || 0)}
                closed={prFilter === "all" ? (metrics.closed || 0) : 0}
              />
            </div>
          )}

          {metrics?.gitlab && (
            <div className="space-y-4 border-t border-[var(--border)] pt-4">
              <p className="text-sm font-medium text-[var(--muted-foreground)]">GitLab MRs</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {gitlabStats
                  .filter((stat) => {
                    if (prFilter === "all") return true;
                    const lbl = stat.label.toLowerCase();
                    if (prFilter === "open") return lbl.includes("open") || lbl.includes("stale");
                    if (prFilter === "merged") return lbl.includes("merged") || lbl.includes("review") || lbl.includes("merge rate");
                    return true;
                  })
                  .map(renderStat)}
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-[var(--muted-foreground)]">
                  MR Status Distribution
                </p>
                <PRStatusDonutChart
                  open={prFilter === "merged" ? 0 : (metrics.gitlab.open || 0)}
                  merged={prFilter === "open" ? 0 : (metrics.gitlab.merged || 0)}
                  closed={prFilter === "all" ? (metrics.gitlab.closed || 0) : 0}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}