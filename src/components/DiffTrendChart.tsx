"use client";

import { useCallback, useEffect, useState } from "react";
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
import { useAccount } from "@/components/AccountContext";

interface WeekData {
  week: string;
  additions: number;
  deletions: number;
}

interface DiffTrendData {
  weeks: WeekData[];
  isComputing: boolean;
  repoCount: number;
}

export default function DiffTrendChart() {
  const { selectedAccount } = useAccount();
  const [data, setData] = useState<WeekData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isComputing, setIsComputing] = useState(false);
  const [repoCount, setRepoCount] = useState(0);

  const fetchDiffTrend = useCallback(() => {
    setLoading(true);
    setError(null);
    setIsComputing(false);

    const url =
      selectedAccount !== null
        ? `/api/metrics/diff-trend?accountId=${encodeURIComponent(selectedAccount)}`
        : "/api/metrics/diff-trend";

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error("API error");
        return r.json();
      })
      .then((res: DiffTrendData) => {
        setData(res.weeks || []);
        setIsComputing(res.isComputing);
        setRepoCount(res.repoCount || 0);
      })
      .catch(() =>
        setError(
          "We couldn't load your diff trend data. Please try again in a moment.",
        ),
      )
      .finally(() => setLoading(false));
  }, [selectedAccount]);

  useEffect(() => {
    fetchDiffTrend();
  }, [fetchDiffTrend]);

  // Format week date for display
  const chartData = data.map((d) => {
    const date = new Date(d.week);
    const formatted = `${date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })}`;
    return {
      week: formatted,
      additions: d.additions,
      deletions: d.deletions,
    };
  });

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
      <h2 className="mb-2 text-lg font-semibold text-[var(--card-foreground)]">
        Code Change Trend
      </h2>
      <p className="mb-4 text-xs text-[var(--muted-foreground)]">
        Lines added/removed per week (last 12 weeks, top {repoCount} repos)
      </p>

      {loading ? (
        <div className="bg-[var(--card-muted)] rounded-lg p-4 h-80 animate-pulse" />
      ) : error ? (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          <p>{error}</p>
          <button
            type="button"
            onClick={fetchDiffTrend}
            className="mt-3 rounded-md border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/10"
          >
            Try again
          </button>
        </div>
      ) : isComputing ? (
        <div className="flex items-center justify-center h-80 text-[var(--muted-foreground)]">
          <div className="text-center">
            <div className="mb-2 inline-block">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
            </div>
            <p className="text-sm font-medium">Computing statistics...</p>
            <p className="text-xs mt-1">
              GitHub is analyzing repository data (this happens once per day)
            </p>
          </div>
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex items-center justify-center h-80 text-[var(--muted-foreground)]">
          <p>No data available yet</p>
        </div>
      ) : (
        <div className="w-full h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="week"
                stroke="var(--muted-foreground)"
                angle={-45}
                textAnchor="end"
                height={100}
                tick={{ fontSize: 12 }}
              />
              <YAxis stroke="var(--muted-foreground)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "0.5rem",
                  color: "var(--card-foreground)",
                }}
                cursor={{ fill: "var(--accent)/10" }}
                formatter={(value, name) => {
                  if (name === "additions") {
                    return [`${value} added`, "Additions"];
                  }
                  return [`${value} removed`, "Deletions"];
                }}
                separator=": "
              />
              <Legend wrapperStyle={{ paddingTop: "20px" }} iconType="square" />
              <Bar
                dataKey="additions"
                fill="var(--success)"
                name="Lines Added"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="deletions"
                fill="var(--destructive)"
                name="Lines Removed"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
