"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useAccount } from "@/components/AccountContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Percent } from "lucide-react";
import PRStatusDonutChart from "./PRStatusDonutChart";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface PRMetricsSummary {
  open: number;
  merged: number;
  closed: number;
  total: number;
  avgReviewHours: number;
  avgFirstReviewHours: number | null;
  mergeRate: string;
  avgCycleTime?: number;
}

interface PRData extends PRMetricsSummary {
  reviewsGiven?: number;
  reviewRatio?: number;
  gitlab?: PRMetricsSummary;
  weeklyTrend?: { week: string; avgHours: number }[];
  slowestRepos?: { repo: string; avgHours: number }[];
  reviews?: {
    totalReviews: number;
    approvalRate: string;
    topRepos: { repo: string; count: number }[];
  };
}

interface PRStat {
  label: string;
  value: string | number;
  title?: string;
  warning?: boolean;
  href?: string;
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
  const [staleThresholdDays, setStaleThresholdDays] = useState(14);
  
  // Track refresh timers safely
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [minutesAgo, setMinutesAgo] = useState(0);

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
    if (!lastUpdated) return;
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
      avgCycleTime?: string;
    }
  ) => {
    return [
      { label: labels.open, value: source.open },
      { label: labels.merged, value: source.merged },
      { label: labels.avgReview, value: `${source.avgReviewHours}h` },
      {
        label: labels.avgFirstReview,
        value: formatReviewCycle(source.avgFirstReviewHours),
        title: "Average time from PR open to first review comment or approval",
      },
      { label: labels.mergeRate, value: source.mergeRate },
      ...(labels.avgCycleTime && source.avgCycleTime !== undefined 
        ? [{ label: labels.avgCycleTime, value: `${source.avgCycleTime}h` }] 
        : [])
    ];
  };

  const githubStats = metrics
    ? buildStats(metrics, {
        open: "Open PRs",
        merged: "Merged (30d)",
        avgReview: "Avg Review Time",
        avgFirstReview: "Avg First Review",
        mergeRate: "Merge Rate",
        avgCycleTime: "Avg Cycle Time",
      })
    : [];

  const gitlabStats = metrics?.gitlab
    ? buildStats(metrics.gitlab, {
        open: "Open MRs",
        merged: "Merged MRs",
        avgReview: "Avg Review Time",
        avgFirstReview: "Avg First Review",
        mergeRate: "Merge Rate",
      })
    : [];

  const renderStat = (stat: PRStat) => {
    const content = (
      <>
        <div className={`truncate text-2xl font-bold ${stat.warning ? "text-orange-300" : "text-[var(--accent)]"}`}>
          {stat.value}
        </div>
        <div className="truncate mt-1 text-sm text-[var(--muted-foreground)]">{stat.label}</div>
      </>
    );

    const className = `rounded-lg p-4 text-center min-w-0 border border-transparent transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-md ${
      stat.warning
        ? "border-orange-400/30 bg-orange-500/10 hover:bg-orange-500/15 hover:border-orange-400/50"
        : "bg-[var(--control)] hover:bg-[var(--control-hover)] hover:border-[var(--border)]"
    }`;

    return stat.href ? (
      <a key={stat.label} href={stat.href} target="_blank" rel="noopener noreferrer" className={className} title={stat.title}>
        {content}
      </a>
    ) : (
      <div key={stat.label} className={className} title={stat.title}>
        {content}
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--card-foreground)]">PR Analytics</h2>
          <p className="text-sm text-[var(--muted-foreground)]">Monitor integration flows and team calibration</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("authored")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === "authored" ? "bg-[var(--accent)] text-white" : "bg-[var(--control)] text-[var(--muted-foreground)] hover:bg-[var(--card-muted)]"
              }`}
            >
              PRs Authored
            </button>
            <button
              onClick={() => setActiveTab("reviews")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === "reviews" ? "bg-[var(--accent)] text-white" : "bg-[var(--control)] text-[var(--muted-foreground)] hover:bg-[var(--card-muted)]"
              }`}
            >
              Reviews Given
            </button>
          </div>
          <label className="flex items-center gap-2 text-xs font-medium text-[var(--muted-foreground)]">
            Stale after
            <select
              value={staleThresholdDays}
              onChange={(event) => setStaleThresholdDays(Number(event.target.value))}
              className="rounded-md border border-[var(--border)] bg-[var(--control)] px-2 py-1 text-sm text-[var(--foreground)] transition-colors"
            >
              {[7, 14, 30].map((days) => (
                <option key={days} value={days}>{days} days</option>
              ))}
            </select>
          </label>
        </div>
      </div>

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
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400 text-center">
          <p>{error}</p>
          <button onClick={fetchMetrics} className="mt-3 rounded-md px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10 border border-red-500/30">
            Try again
          </button>
        </div>
      ) : activeTab === "authored" ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-[var(--control)] border-[var(--border)] text-[var(--card-foreground)]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Reviews Given (Last 30 Days)</CardTitle>
                <Eye className="h-4 w-4 text-[var(--muted-foreground)]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.reviewsGiven ?? metrics?.reviews?.totalReviews ?? 0}</div>
                <p className="text-xs text-[var(--muted-foreground)]">Total pull request reviews submitted</p>
              </CardContent>
            </Card>

            <Card className="bg-[var(--control)] border-[var(--border)] text-[var(--card-foreground)]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Review Participation Ratio</CardTitle>
                <Percent className="h-4 w-4 text-[var(--muted-foreground)]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.reviewRatio ?? 0}x</div>
                <p className="text-xs text-[var(--muted-foreground)]">Reviews submitted per authored PR</p>
              </CardContent>
            </Card>
          </div>

          <div className="border-t border-[var(--border)] pt-4 space-y-6">
            <div>
              <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
                <p className="text-sm font-medium text-[var(--muted-foreground)]">GitHub PRs</p>
                <div className="flex items-center gap-2">
                  {(["all", "merged", "open"] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setPrFilter(filter)}
                      className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition-colors ${
                        prFilter === filter ? "bg-[var(--accent)] text-white" : "bg-[var(--control)] text-[var(--muted-foreground)]"
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                <div className="space-y-2 md:col-span-1">
                  <p className="text-sm font-medium text-[var(--muted-foreground)]">PR Status Distribution</p>
                  <PRStatusDonutChart
                    open={prFilter === "merged" ? 0 : (metrics.open || 0)}
                    merged={prFilter === "open" ? 0 : (metrics.merged || 0)}
                    closed={prFilter === "all" ? (metrics.closed || 0) : 0}
                  />
                </div>

                <div className="md:col-span-2 space-y-4">
                  {metrics.weeklyTrend && metrics.weeklyTrend.length > 0 && (
                    <div className="rounded-lg bg-[var(--control)] p-4 border border-[var(--border)]">
                      <h3 className="text-sm font-semibold text-[var(--card-foreground)] mb-3">Review Cycle Trend</h3>
                      <div className="h-[180px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={metrics.weeklyTrend}>
                            <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} unit="h" />
                            <Tooltip formatter={(val) => [`${val}h`, "Avg Cycle Time"]} />
                            <Line type="monotone" dataKey="avgHours" stroke="var(--accent)" strokeWidth={2} dot={{ r: 4 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {metrics.slowestRepos && metrics.slowestRepos.length > 0 && (
                    <div className="rounded-lg bg-[var(--control)] p-4 border border-[var(--border)]">
                      <h3 className="text-sm font-semibold text-[var(--card-foreground)] mb-3">Slowest Review Repos</h3>
                      <div className="space-y-2">
                        {metrics.slowestRepos.map((r) => (
                          <div key={r.repo} className="flex justify-between items-center bg-[var(--card)] p-2 rounded border border-[var(--border)]">
                            <span className="text-sm text-[var(--muted-foreground)] truncate mr-4">{r.repo}</span>
                            <span className="text-sm font-bold text-[var(--accent)] flex-shrink-0">{r.avgHours}h</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {metrics?.gitlab && (
              <div className="space-y-4 border-t border-[var(--border)] pt-6">
                <p className="text-sm font-medium text-[var(--muted-foreground)]">GitLab MRs</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
                <div className="space-y-2 max-w-sm">
                  <p className="text-sm font-medium text-[var(--muted-foreground)]">MR Status Distribution</p>
                  <PRStatusDonutChart
                    open={prFilter === "merged" ? 0 : (metrics.gitlab.open || 0)}
                    merged={prFilter === "open" ? 0 : (metrics.gitlab.merged || 0)}
                    closed={prFilter === "all" ? (metrics.gitlab.closed || 0) : 0}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "Total Reviews Given", value: metrics?.reviews?.totalReviews ?? metrics?.reviewsGiven ?? 0 },
              { label: "Approval Rate", value: metrics?.reviews?.approvalRate ?? "0%" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-lg bg-[var(--control)] p-4 text-center border border-[var(--border)]">
                <div className="text-2xl font-bold text-[var(--accent)]">{stat.value}</div>
                <div className="mt-1 text-sm text-[var(--muted-foreground)]">{stat.label}</div>
              </div>
            ))}
          </div>
          {metrics?.reviews?.topRepos && metrics.reviews.topRepos.length > 0 && (
            <div className="rounded-lg bg-[var(--control)] p-4 border border-[var(--border)]">
              <h3 className="text-sm font-semibold text-[var(--card-foreground)] mb-3">Top Reviewed Repositories</h3>
              <div className="space-y-2">
                {metrics.reviews.topRepos.map((item) => (
                  <div key={item.repo} className="flex justify-between items-center bg-[var(--card)] p-2 rounded border border-[var(--border)]">
                    <span className="text-sm text-[var(--muted-foreground)] truncate mr-4">{item.repo}</span>
                    <span className="text-sm font-bold text-[var(--accent)] flex-shrink-0">{item.count} reviews</span>
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