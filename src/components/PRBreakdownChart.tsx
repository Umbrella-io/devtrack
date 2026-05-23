"use client";

import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

interface PRBreakdown {
  draft: number;
  open: number;
  merged: number;
  closed: number;
}

const SLICES: { key: keyof PRBreakdown; label: string; color: string }[] = [
  { key: "open",   label: "Open",   color: "#6366f1" },
  { key: "merged", label: "Merged", color: "#34d399" },
  { key: "closed", label: "Closed", color: "#fb923c" },
  { key: "draft",  label: "Draft",  color: "#94a3b8" },
];

export default function PRBreakdownChart() {
  const [breakdown, setBreakdown] = useState<PRBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getCSSVariable = (varName: string): string => {
    if (typeof window === "undefined") return "#000";
    return getComputedStyle(document.documentElement)
      .getPropertyValue(varName)
      .trim();
  };

  const fetchBreakdown = () => {
    setLoading(true);
    setError(null);

    fetch("/api/metrics/pr-breakdown")
      .then((r) => r.json())
      .then((d: PRBreakdown) => setBreakdown(d))
      .catch(() =>
        setError("We couldn't load your PR breakdown right now. Please try again in a moment.")
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBreakdown();
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <div role="status" aria-live="polite" aria-busy="true">
          <span className="sr-only">Loading PR breakdown</span>
          <div
            aria-hidden="true"
            className="mb-4 h-5 w-40 rounded bg-[var(--card-muted)] animate-pulse"
          />
          <div
            aria-hidden="true"
            className="h-[200px] rounded bg-[var(--card-muted)] animate-pulse"
          />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-[var(--card-foreground)]">PR Breakdown</h2>
        <div className="rounded-lg border border-[var(--destructive)]/20 bg-[var(--destructive)]/10 p-4 text-sm text-[var(--destructive)]">
          <p>{error}</p>
          <button
            type="button"
            onClick={fetchBreakdown}
            className="mt-3 rounded-md border border-[var(--destructive)]/30 px-3 py-1.5 text-xs font-medium text-[var(--destructive)] transition-colors hover:bg-[var(--destructive)]/10"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const total = breakdown ? SLICES.reduce((sum, s) => sum + breakdown[s.key], 0) : 0;
  const chartData = breakdown
    ? SLICES.map((s) => ({ name: s.label, value: breakdown[s.key], color: s.color })).filter(
        (d) => d.value > 0
      )
    : [];

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-[var(--card-foreground)]">PR Breakdown</h2>
      {total === 0 ? (
        <p className="flex h-[200px] items-center justify-center text-sm text-[var(--muted-foreground)]">
          No pull requests found.
        </p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                dataKey="value"
                paddingAngle={2}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
  contentStyle={{
    backgroundColor: getCSSVariable('--card'),
    border: `1px solid ${getCSSVariable('--border')}`,
    borderRadius: "10px",
    color: getCSSVariable('--foreground'),
  }}
  itemStyle={{
    color: getCSSVariable('--foreground'),
  }}
  labelStyle={{
    color: getCSSVariable('--foreground'),
  }}
/>
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 flex flex-wrap justify-center gap-4">
            {SLICES.map((s) => (
              <div
                key={s.key}
                className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]"
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                {s.label}: {breakdown?.[s.key] ?? 0}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
