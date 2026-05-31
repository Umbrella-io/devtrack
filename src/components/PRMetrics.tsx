"use client";
import SectionHeader from "./SectionHeader";

import { useCallback, useEffect, useState } from "react";
import { useAccount } from "@/components/AccountContext";
import PRStatusDonutChart from "./PRStatusDonutChart";
import MiniPRTrendChart from "./MiniPRTrendChart";

interface ReviewMetrics {
  totalReviews: number;
  approvalRate: string;
  avgFirstReviewHours: number | null;
  topRepos: { repo: string; count: number }[];
}

interface PRMetricsSummary {
  open: number;
  merged: number;
  closed: number;
  avgReviewHours: number;
  avgFirstReviewHours: number | null;
  mergeRate: string;
  staleCount: number;
  staleThresholdDays: number;
  staleSearchUrl: string | null;
}

interface PRStat {
  label: string;
  value: string | number;
  href?: string | null;
  title?: string;
  warning?: boolean;
}

interface PRData extends PRMetricsSummary {
  gitlab?: PRMetricsSummary;
  reviews?: ReviewMetrics;
}

function formatReviewCycle(hours: number | null): string {
  if (hours === null) {
    return "--";
  }

  if (hours < 24) {
    return `${hours}h`;
  }

  return `${Math.round((hours / 24) * 10) / 10}d`;
}

export default function PRMetrics() {
  const { selectedAccount } = useAccount();
  const [metrics, setMetrics] = useState<PRData | null>(null);
  const [staleThresholdDays, setStaleThresholdDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [minutesAgo, setMinutesAgo] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"authored" | "reviews">("authored");
  const [prFilter, setPrFilter] = useState<"all" | "merged" | "open">("all");

  const fetchMetrics = useCallback(() => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      staleThresholdDays: String(staleThresholdDays),
    });

    if (selectedAccount !== null) {
      params.set("accountId", selectedAccount);
    }

    fetch(`/api/metrics/prs?${params.toString()}`)
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
  }, [selectedAccount, staleThresholdDays]);

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
      stale?: string;
    },
    options: { includeStale?: boolean } = {}
  ): PRStat[] => [
    { label: labels.open, value: source.open },
    ...(options.includeStale
      ? [
          {
            label: labels.stale ?? `Stale > ${source.staleThresholdDays}d`,
            value: source.staleCount,
            href: source.staleSearchUrl,
            title: `${source.staleCount} open PRs are older than ${source.staleThresholdDays} days`,
            warning: source.staleCount > 0,
          },
        ]
      : []),
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
    ? buildStats(
        metrics,
        {
          open: "Open PRs",
          merged: "Merged (30d)",
          avgReview: "Avg Review Time",
          avgFirstReview: "Avg First Review",
          mergeRate: "Merge Rate",
        },
        { includeStale: true }
      )
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

  const renderStat = (stat: PRStat) => {
    const content = (
      <>
        <div
          className={`truncate text-2xl font-bold ${
            stat.warning ? "text-orange-300" : "text-[var(--accent)]"
          }`}
        >
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
      <a
        key={stat.label}
        href={stat.href}
        target="_blank"
        rel="noreferrer"
        className={className}
        title={stat.title}
      >
        {content}
      </a>
    ) : (
      // 🎯 Fixed: Changed opening tag to match closing tag correctly
      <div key={stat.label} className={className} title={stat.title}>
        {content}
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SectionHeader title="PR Analytics" />
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("authored")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === "authored"
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--control)] text-[var(--muted-foreground)] hover:bg-[var(--card-muted)]"
              }`}
            >
              PRs Authored
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("reviews")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === "reviews"
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--control)] text-[var(--muted-foreground)] hover:bg-[var(--card-muted)]"
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
              className="rounded-md border border-[var(--border)] bg-[var(--control)] px-2 py-1 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent)]"
            >
              {[7, 14, 30].map((days) => (
                <option key={days} value={days}>
                  {days} days
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      {loading ? (
        <div
          role="status"
          aria-live="polite"
          aria-busy="true"
          className="space-y-4"
        >
          <span className="sr-only">Loading PR analytics</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
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
        <div className="rounded-lg border border-[var(--destructive-muted-border)] bg-[var(--destructive-muted)] p-4 text-sm text-[var(--destructive)]">
          <p>{error}</p>
          <button
            type="button"
            onClick={fetchMetrics}
            className="mt-3 rounded-md border border-[var(--destructive-muted-border)] px-3 py-1.5 text-xs font-medium text-[var(--destructive)] transition-colors hover:bg-[var(--destructive-muted)]"
          >
            Try again
          </button>
        </div>
      ) : activeTab === "authored" ? (
        <div className="space-y-6">
          <div>
            <div className="flex flex-wrap items-center justify-between mb-4">
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
            
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
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
            {prFilter !== "open" && <MiniPRTrendChart />}
          </div>

          {metrics && (
            <div>
              <p className="mb-2 text-sm font-medium text-[var(--muted-foreground)]">
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
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
              <div>
                <p className="mb-2 text-sm font-medium text-[var(--muted-foreground)]">
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
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Total Reviews Given", value: metrics?.reviews?.totalReviews ?? 0 },
              { label: "Approval Rate", value: metrics?.reviews?.approvalRate ?? "0%" },
            ].map((stat) => (
              <div 
                key={stat.label} 
                className="rounded-lg bg-[var(--control)] border border-transparent p-4 text-center transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-md hover:bg-[var(--control-hover)] hover:border-[var(--border)]"
              >
                <div className="text-2xl font-bold text-[var(--accent)]">{stat.value}</div>
                <div className="mt-1 text-sm text-[var(--muted-foreground)]">{stat.label}</div>
              </div>
            ))}
          </div>
          {metrics?.reviews?.topRepos && metrics.reviews.topRepos.length > 0 && (
            <div>
              <p className="mb-3 text-sm font-medium text-[var(--muted-foreground)]">Most Reviewed Repos</p>
              <div className="space-y-2">
                {metrics.reviews.topRepos.map((item) => (
                  <div key={item.repo} className="flex items-center justify-between rounded-lg bg-[var(--control)] px-4 py-2">
                    <span className="truncate text-sm text-[var(--card-foreground)]">{item.repo}</span>
                    <span className="ml-4 shrink-0 text-sm font-semibold text-[var(--accent)]">
                      {item.count} review{item.count !== 1 ? "s" : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {(metrics?.reviews?.totalReviews ?? 0) === 0 && (
            <p className="text-sm text-[var(--muted-foreground)]">No reviews found for this period.</p>
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