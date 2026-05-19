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

interface TimeDistribution {
  lessThan1h: number;
  from1hTo24h: number;
  from1dTo7d: number;
  moreThan7d: number;
}

interface PRData {
  open: number;
  merged: number;
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
              </div>
              <div className="truncate mt-1 text-sm text-[var(--muted-foreground)]">{stat.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
