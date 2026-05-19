"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface IssueMetricsData {
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
  const [data, setData] = useState<IssueMetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/metrics/issues`);
        if (!res.ok) throw new Error("Failed to load metrics");
        const result = (await res.json()) as IssueMetricsData;
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load issue metrics");
      } finally {
        setLoading(false);
      }
    }
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="w-full p-6 rounded-xl border border-[var(--border)] bg-[var(--card)] animate-pulse space-y-6">
        <div className="h-6 w-48 bg-[var(--muted)] rounded" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-4 rounded-lg bg-[var(--muted)]/20 h-20" />
          ))}
        </div>
        <div className="h-[250px] w-full bg-[var(--muted)]/10 rounded-lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="w-full p-6 rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 text-center">
        <p>{error || "Error loading issue metrics"}</p>
      </div>
    );
  }

  return (
    <div className="w-full p-6 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] space-y-6 shadow-sm">
      <div>
        <h3 className="text-lg font-bold tracking-tight">Issue Tracker Metrics</h3>
        <p className="text-sm text-[var(--muted-foreground)]">Snapshot of issue velocities and timeline histories</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-[var(--popover)] border border-[var(--border)]">
          <p className="text-xs font-medium uppercase text-[var(--muted-foreground)]">Open Issues</p>
          <p className="text-2xl font-bold text-[var(--accent)] mt-1">{data.stats.totalOpen}</p>
        </div>
        <div className="p-4 rounded-lg bg-[var(--popover)] border border-[var(--border)]">
          <p className="text-xs font-medium uppercase text-[var(--muted-foreground)]">Opened This Week</p>
          <p className="text-2xl font-bold text-[var(--foreground)] mt-1">{data.stats.openedThisWeek}</p>
        </div>
        <div className="p-4 rounded-lg bg-[var(--popover)] border border-[var(--border)]">
          <p className="text-xs font-medium uppercase text-[var(--muted-foreground)]">Closed This Week</p>
          <p className="text-2xl font-bold text-[var(--success)] mt-1">{data.stats.closedThisWeek}</p>
        </div>
        <div className="p-4 rounded-lg bg-[var(--popover)] border border-[var(--border)]">
          <p className="text-xs font-medium uppercase text-[var(--muted-foreground)]">Avg Days to Close</p>
          <p className="text-2xl font-bold text-[var(--accent)] mt-1">{data.stats.avgDaysToClose}d</p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-[var(--muted-foreground)]">12-Week Open Issues Trend</p>
        <div className="h-[250px] w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
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