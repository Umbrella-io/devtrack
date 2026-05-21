"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface WeeklySummaryData {
  commits: {
    current: number;
    previous: number;
    delta: number;
    trend: "up" | "down" | "same";
  };
  prs: {
    thisWeek: {
      opened: number;
      merged: number;
    };
    lastWeek: {
      opened: number;
      merged: number;
    };
  };
  activeDays: {
    thisWeek: number;
    lastWeek: number;
  };
  streak: number;
  topRepo: string | null;
}

interface ChartDataPoint {
  name: string;
  "Last Week": number;
  "This Week": number;
}

export default function WeeklySummaryCard() {
  const [summary, setSummary] = useState<WeeklySummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [colors, setColors] = useState({
    lastWeek: "",
    thisWeek: "",
    border: "",
    muted: "",
    card: "",
    foreground: "",
  });

  useEffect(() => {
    const getColor = (varName: string): string => {
      if (typeof window === "undefined") return "";
      const value = getComputedStyle(document.documentElement)
        .getPropertyValue(varName)
        .trim();
      return value;
    };

    setColors({
      lastWeek: getColor("--muted-foreground"),
      thisWeek: getColor("--accent"),
      border: getColor("--border"),
      muted: getColor("--muted-foreground"),
      card: getColor("--card"),
      foreground: getColor("--card-foreground"),
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch("/api/metrics/weekly-summary")
      .then((r) => {
        if (!r.ok) throw new Error("API error");
        return r.json();
      })
      .then((data: WeeklySummaryData) => setSummary(data))
      .catch(() =>
        setError(
          "We couldn't load your weekly summary right now. Please try again in a moment."
        )
      )
      .finally(() => setLoading(false));
  }, []);

  const chartData: ChartDataPoint[] = summary
    ? [
        {
          name: "Commits",
          "Last Week": summary.commits.previous,
          "This Week": summary.commits.current,
        },
        {
          name: "PRs Merged",
          "Last Week": summary.prs.lastWeek.merged,
          "This Week": summary.prs.thisWeek.merged,
        },
        {
          name: "Active Days",
          "Last Week": summary.activeDays.lastWeek,
          "This Week": summary.activeDays.thisWeek,
        },
      ]
    : [];


  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--card-foreground)]">
          This Week
        </h2>
        <button
          type="button"
          onClick={() => setIsCollapsed((value) => !value)}
          className="text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--card-foreground)]"
          aria-expanded={!isCollapsed}
          aria-label={
            isCollapsed ? "Expand weekly summary" : "Collapse weekly summary"
          }
        >
          {isCollapsed ? ">" : "v"}
        </button>
      </div>

      {!isCollapsed &&
        (loading ? (
          <div
            role="status"
            aria-live="polite"
            aria-busy="true"
            className="mt-4 space-y-3"
          >
            <span className="sr-only">Loading weekly summary</span>
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                aria-hidden="true"
                className="h-14 rounded-lg bg-[var(--card-muted)] animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-[var(--destructive)]">
            {error}
          </div>
        ) : summary ? (
          <div className="mt-4 space-y-6">
            {/* Comparison Chart */}
            <div className="rounded-lg bg-[var(--control)] p-4">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={colors.border}
                    opacity={0.3}
                  />
                  <XAxis
                    dataKey="name"
                    stroke={colors.muted}
                    style={{ fontSize: "12px" }}
                  />
                  <YAxis
                    stroke={colors.muted}
                    style={{ fontSize: "12px" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: colors.card,
                      border: `1px solid ${colors.border}`,
                      borderRadius: "6px",
                      color: colors.foreground,
                    }}
                    cursor={{ fill: "var(--control)" }}
                  />
                  <Legend
                    wrapperStyle={{ color: colors.foreground }}
                    iconType="square"
                  />
                  <Bar
                    dataKey="Last Week"
                    fill={colors.lastWeek}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="This Week"
                    fill={colors.thisWeek}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Stats Grid */}
            <div className="space-y-3">
              {/* Commits */}
              <div className="flex items-center justify-between rounded-lg bg-[var(--control)] p-4">
                <span className="text-sm text-[var(--muted-foreground)]">
                  Commits
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold text-[var(--card-foreground)]">
                    {summary.commits.current}
                  </span>
                  {summary.commits.trend === "up" && (
                    <span
                      className="text-sm font-medium text-[var(--success)]"
                    >
                      + {summary.commits.delta}
                    </span>
                  )}
                  {summary.commits.trend === "down" && (
                    <span
                      className="text-sm font-medium text-[var(--destructive)]"
                    >
                      - {Math.abs(summary.commits.delta)}
                    </span>
                  )}
                  {summary.commits.trend === "same" && (
                    <span
                      className="text-sm font-medium text-[var(--muted-foreground)]"
                    >
                      0
                    </span>
                  )}
                </div>
              </div>

              {/* PRs */}
              <div className="flex items-center justify-between rounded-lg bg-[var(--control)] p-4">
                <span className="text-sm text-[var(--muted-foreground)]">
                  PRs
                </span>
                <span className="text-base font-semibold text-[var(--card-foreground)]">
                  {summary.prs.thisWeek.opened} opened /{" "}
                  {summary.prs.thisWeek.merged} merged
                </span>
              </div>

              {/* Active Days */}
              <div className="flex items-center justify-between rounded-lg bg-[var(--control)] p-4">
                <span className="text-sm text-[var(--muted-foreground)]">
                  Active days
                </span>
                <span className="text-base font-semibold text-[var(--card-foreground)]">
                  {summary.activeDays.thisWeek} / 7 days
                </span>
              </div>

              {/* Streak */}
              <div className="flex items-center justify-between rounded-lg bg-[var(--control)] p-4">
                <span className="text-sm text-[var(--muted-foreground)]">
                  Streak
                </span>
                <span className="text-base font-semibold text-[var(--card-foreground)]">
                  {summary.streak} day streak
                </span>
              </div>

              {/* Top Repo */}
              <div className="flex items-center justify-between rounded-lg bg-[var(--control)] p-4">
                <span className="text-sm text-[var(--muted-foreground)]">
                  Top repo
                </span>
                <span className="text-base font-semibold text-[var(--card-foreground)]">
                  {summary.topRepo ?? "-"}
                </span>
              </div>
            </div>
          </div>
        ) : null)}
    </div>
  );
}
