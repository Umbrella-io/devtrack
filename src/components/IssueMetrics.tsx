"use client";

import { useEffect, useState, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useAccount } from "@/components/AccountContext";

interface IssueData {
  stats: {
    totalOpen: number;
    openedThisWeek: number;
    closedThisWeek: number;
    avgDaysToClose: number;
  };
  chartData: Array<{
    week: string;
    issues: number;
  }>;
}

export default function IssueMetrics() {
  const { selectedAccount } = useAccount();
  const [metrics, setMetrics] = useState<IssueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(() => {
    setLoading(true);
    setError(null);

    const url = selectedAccount !== null
      ? `/api/metrics/issues?accountId=${encodeURIComponent(selectedAccount)}`
      : "/api/metrics/issues";

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load metrics");
        return r.json();
      })
      .then((data: IssueData) => setMetrics(data))
      .catch(() =>
        setError(
          "We couldn't load your Issues analytics right now. Please try again in a moment."
        )
      )
      .finally(() => setLoading(false));
  }, [selectedAccount]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  if (loading) {
    return (
      <div className="w-full p-6 rounded-xl border border-[var(--border)] bg-[var(--card)] animate-pulse space-y-6">
        <div className="h-6 w-48 bg-[var(--muted)] rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-[var(--card-muted)] p-4" />
          ))}
        </div>
        <div className="h-[250px] w-full bg-[var(--muted)]/10 rounded-lg" />
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="rounded-lg border border-[var(--destructive)]/20 bg-[var(--destructive)]/10 p-4 text-sm text-[var(--destructive)] text-center">
        <p>{error || "Error loading issue metrics"}</p>
        <button
          type="button"
          onClick={fetchMetrics}
          className="mt-3 rounded-md border border-[var(--destructive)]/30 px-3 py-1.5 text-xs font-medium text-[var(--destructive)] transition-colors hover:bg-[var(--destructive)]/10"
        >
          Try again
        </button>
      </div>
    );
  }

  // Map incoming metrics safely into semantic arrays for your custom visual template
  const statsDisplay = [
    { label: "Open Issues", value: metrics.stats.totalOpen },
    { label: "Opened This Week", value: metrics.stats.openedThisWeek },
    { label: "Closed This Week", value: metrics.stats.closedThisWeek },
    { label: "Avg Days to Close", value: `${metrics.stats.avgDaysToClose}d` },
  ];

  // Dynamic status evaluation strictly using theme tokens instead of raw color definitions
  const trendLabel = metrics.stats.openedThisWeek > metrics.stats.closedThisWeek ? "+ Velocity increase" : "Stable velocity";
  const trendColor = metrics.stats.openedThisWeek > metrics.stats.closedThisWeek ? "text-[var(--destructive)]" : "text-[var(--success)]";

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm space-y-6 text-[var(--foreground)]">
      <div>
        <h2 className="text-lg font-semibold text-[var(--card-foreground)]">
          Issue Analytics
        </h2>
        <p className="text-sm text-[var(--muted-foreground)]">Snapshot of issue velocities and timeline histories</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsDisplay.map((stat, idx) => (
          <div
            key={stat.label}
            className="rounded-lg bg-[var(--control)] p-4 text-center border border-[var(--border)]"
          >
            <div className="text-2xl font-bold text-[var(--accent)] truncate" title={String(stat.value)}>
              {stat.value}
            </div>
            <div className="mt-1 text-sm text-[var(--muted-foreground)]">
              {stat.label}
            </div>
            {idx === 0 && (
              <div className={`mt-1 text-xs font-medium ${trendColor}`}>
                {trendLabel}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-[var(--muted-foreground)]">12-Week Open Issues Trend</p>
        <div className="h-[250px] w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={metrics.chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
              <XAxis dataKey="week" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)", borderRadius: "8px" }} />
              <Line type="monotone" dataKey="issues" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}