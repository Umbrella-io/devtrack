"use client";

import { useEffect, useRef, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DayData {
  day: string;
  commits: number;
}

type ViewMode = "bar" | "line";

const RANGES = [
  { label: "7d", days: 7 },
  { label: "14d", days: 14 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

const charts: { key: ViewMode; label: string }[] = [
  { key: "bar", label: "Bar" },
  { key: "line", label: "Line" },
];

export default function ContributionGraph() {
  const [data, setData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [chartType, setChartType] = useState<ViewMode>("bar");
  const announcerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/metrics/contributions?days=${days}`)
      .then((r) => r.json())
      .then((res: { data: Record<string, number> }) => {
        const sorted = Object.entries(res.data ?? {})
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([day, commits]) => ({ day, commits }));
        setData(sorted);
        if (announcerRef.current) {
          const total = sorted.reduce((sum, d) => sum + d.commits, 0);
          announcerRef.current.textContent = `Commit activity chart updated: ${total} commits over the last ${days} days.`;
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [days]);

  const totalCommits = data.reduce((sum, d) => sum + d.commits, 0);

  return (
    <section
      aria-labelledby="commit-activity-heading"
      className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm"
    >
      {/* Live region for dynamic updates */}
      <div ref={announcerRef} aria-live="polite" aria-atomic="true" className="sr-only" />

      <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
        <h2
          id="commit-activity-heading"
          className="text-lg font-semibold text-[var(--card-foreground)]"
        >
          Commit Activity
        </h2>

        <div className="flex flex-wrap items-center gap-2">
          {/* Range selector */}
          <div
            className="flex gap-1 rounded-lg bg-[var(--control)] p-1"
            role="group"
            aria-label="Select date range"
          >
            {RANGES.map((r) => (
              <button
                key={r.days}
                onClick={() => setDays(r.days)}
                aria-pressed={days === r.days}
                aria-label={`Show last ${r.label}`}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  days === r.days
                    ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                    : "text-[var(--muted-foreground)] hover:text-[var(--card-foreground)]"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Chart type toggle */}
          {data.length > 0 && (
            <div
              className="flex gap-1 rounded-lg bg-[var(--control)] p-1 text-sm"
              role="group"
              aria-label="Select chart type"
            >
              {charts.map((chart) => (
                <button
                  key={chart.key}
                  onClick={() => setChartType(chart.key)}
                  aria-pressed={chartType === chart.key}
                  aria-label={`${chart.label} chart`}
                  className={`px-3 py-1 rounded-md transition-colors duration-200 ${
                    chartType === chart.key
                      ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                      : "text-[var(--muted-foreground)] hover:text-[var(--card-foreground)]"
                  }`}
                >
                  {chart.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div
          className="h-[200px] rounded bg-[var(--card-muted)] animate-pulse"
          role="status"
          aria-label="Loading commit activity chart"
        />
      ) : data.length === 0 ? (
        <p
          className="flex h-[200px] items-center text-sm text-[var(--muted-foreground)]"
          role="status"
        >
          No commits in the last {days} days.
        </p>
      ) : (
        <>
          {/* Accessible text summary for screen readers */}
          <p className="sr-only">
            {chartType === "bar" ? "Bar" : "Line"} chart showing {totalCommits} total
            commits over the last {days} days.
          </p>
          <ResponsiveContainer width="100%" height={200}>
            {chartType === "bar" ? (
              <BarChart data={data} aria-label={`Bar chart: ${totalCommits} commits in last ${days} days`}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" hide />
                <YAxis stroke="var(--muted-foreground)" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--tooltip)",
                    color: "var(--tooltip-foreground)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                  }}
                  labelStyle={{
                    color: "var(--tooltip-foreground)",
                    fontSize: "12px",
                  }}
                  cursor={{ fill: "var(--card-muted)" }}
                />
                <Bar
                  dataKey="commits"
                  fill="var(--accent)"
                  radius={[4, 4, 0, 0]}
                  name="Commits"
                />
              </BarChart>
            ) : (
              <LineChart data={data} aria-label={`Line chart: ${totalCommits} commits in last ${days} days`}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" hide />
                <YAxis stroke="var(--muted-foreground)" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--tooltip)",
                    color: "var(--tooltip-foreground)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                  }}
                  labelStyle={{
                    color: "var(--tooltip-foreground)",
                    fontSize: "12px",
                  }}
                  cursor={{ fill: "var(--card-muted)" }}
                />
                <Line
                  type="monotone"
                  dataKey="commits"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  dot={false}
                  name="Commits"
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </>
      )}
    </section>
  );
}