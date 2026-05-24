"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useAccount } from "@/components/AccountContext";
import PRStatusDonutChart from "./PRStatusDonutChart";



interface TimeDistribution {
  lessThan1h: number;
  from1hTo24h: number;
  from1dTo7d: number;
  moreThan7d: number;
}

interface PRData {


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
  timeDistribution: TimeDistribution;
}



const BUCKET_LABELS: Record<keyof TimeDistribution, string> = {
  lessThan1h: "< 1h",
  from1hTo24h: "1–24h",
  from1dTo7d: "1–7d",
  moreThan7d: "> 7d",
};

interface PRData extends PRMetricsSummary {
  gitlab?: PRMetricsSummary;
  reviews?: ReviewMetrics;
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
  const [activeTab, setActiveTab] = useState<"authored" | "reviews">("authored");

  const fetchMetrics = useCallback(() => {
    setLoading(true);
    setError(null);

    const url =
      selectedAccount !== null
        ? `/api/metrics/prs?accountId=${encodeURIComponent(selectedAccount)}&days=30`
        : "/api/metrics/prs?days=30";

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error("API error");
        return r.json();
      })

      .then((data: PRData) => setMetrics(data))
      .catch(() =>
        setError(
          "We couldn't load your PR analytics right now. Please try again in a moment.",
        ),
      )

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

  // Prepare histogram data
  const histogramData = metrics
    ? [
        {
          bucket: BUCKET_LABELS.lessThan1h,
          count: metrics.timeDistribution.lessThan1h,
        },
        {
          bucket: BUCKET_LABELS.from1hTo24h,
          count: metrics.timeDistribution.from1hTo24h,
        },
        {
          bucket: BUCKET_LABELS.from1dTo7d,
          count: metrics.timeDistribution.from1dTo7d,
        },
        {
          bucket: BUCKET_LABELS.moreThan7d,
          count: metrics.timeDistribution.moreThan7d,
        },
      ]
    : [];

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">

      <h2 className="mb-4 text-lg font-semibold text-[var(--card-foreground)]">
        PR Analytics
      </h2>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--card-foreground)]">PR Analytics</h2>
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
      </div>

      {loading ? (

        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-[var(--card-muted)] rounded-lg p-4 h-24 animate-pulse"
              />
            ))}
          </div>
          <div className="bg-[var(--card-muted)] rounded-lg p-4 h-64 animate-pulse" />

        <div
          role="status"
          aria-live="polite"
          aria-busy="true"
          className="space-y-4"
        >
          <span className="sr-only">Loading PR analytics</span>


          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              aria-hidden="true"
              className="bg-[var(--card-muted)] rounded-lg p-4 h-24 animate-pulse"
            />
          ))}


          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">

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

      ) : (


        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg bg-[var(--control)] p-4 text-center"
              >
                <div className="text-2xl font-bold text-[var(--accent)]">
                  {stat.value}
                </div>
                <div className="mt-1 text-sm text-[var(--muted-foreground)]">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* PR Open Time Distribution Histogram */}
          <div className="rounded-lg bg-[var(--control)] p-4">
            <h3 className="mb-4 text-sm font-medium text-[var(--card-foreground)]">
              PR Open Time Distribution (30d)
            </h3>
            {histogramData.some((item) => item.count > 0) ? (
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={histogramData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                    />
                    <XAxis type="number" stroke="var(--muted-foreground)" />
                    <YAxis
                      type="category"
                      dataKey="bucket"
                      stroke="var(--muted-foreground)"
                      width={75}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "0.5rem",
                        color: "var(--card-foreground)",
                      }}
                      cursor={{ fill: "var(--accent)/10" }}
                      formatter={(value) => [`${value} PRs`, "Count"]}
                    />
                    <Bar
                      dataKey="count"
                      fill="var(--accent)"
                      radius={[0, 8, 8, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-[var(--muted-foreground)]">
                <p>No PR data available</p>
              </div>
            )}
          </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">

          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg bg-[var(--control)] p-4 text-center min-w-0"
              title={stat.title}
            >
              <div className="truncate text-2xl font-bold text-[var(--accent)]">
                {stat.value}


      ) : activeTab === "authored" ? (

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

                <div className="truncate mt-1 text-sm text-[var(--muted-foreground)]">{stat.label}</div>

              </div>
            ))}

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
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Total Reviews Given", value: metrics?.reviews?.totalReviews ?? 0 },
              { label: "Approval Rate", value: metrics?.reviews?.approvalRate ?? "0%" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-lg bg-[var(--control)] p-4 text-center">
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
