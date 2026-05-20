"use client";

import { useEffect, useState } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface TimeBlocks {
  morning: number;
  afternoon: number;
  evening: number;
  night: number;
}

interface ChartData {
  hour: string;
  commits: number;
}

export default function ActivityRingChart() {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [peakHour, setPeakHour] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/metrics/contributions?days=${days}`)
      .then((r) => r.json())
      .then((res: { timeBlocks?: TimeBlocks }) => {
        if (!res.timeBlocks) {
          setData([]);
          return;
        }

        const blocks = res.timeBlocks;
        const chartData: ChartData[] = [
          { hour: "Morning\n6–12", commits: blocks.morning },
          { hour: "Afternoon\n12–18", commits: blocks.afternoon },
          { hour: "Evening\n18–22", commits: blocks.evening },
          { hour: "Night\n22–6", commits: blocks.night },
        ];

        const peak = chartData.reduce((a, b) =>
          b.commits > a.commits ? b : a
        );
        setPeakHour(peak.commits > 0 ? peak.hour.split("\n")[0] : null);
        setData(chartData);
      })
      .catch(() => setError("Failed to load activity data."))
      .finally(() => setLoading(false));
  }, [days]);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-[var(--card-foreground)]">
          Activity Ring
        </h2>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded-lg border border-[var(--border)] bg-[var(--control)] px-2 py-1 text-sm text-[var(--card-foreground)] focus:outline-none focus:border-[var(--accent)]"
        >
          <option value={7}>Last 7d</option>
          <option value={30}>Last 30d</option>
          <option value={90}>Last 90d</option>
        </select>
      </div>

      <p className="text-sm text-[var(--muted-foreground)] mb-4 h-5">
        {peakHour && `Most active during ${peakHour.toLowerCase()}`}
      </p>

      <div className="flex-1 min-h-[250px]">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-48 w-48 animate-pulse rounded-full bg-[var(--card-muted)]" />
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        ) : data.every((d) => d.commits === 0) ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-[var(--muted-foreground)]">
              No commits in the last {days} days.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis
                dataKey="hour"
                tick={{
                  fill: "var(--muted-foreground)",
                  fontSize: 11,
                }}
              />
              <Radar
                name="Commits"
                dataKey="commits"
                stroke="var(--accent)"
                fill="var(--accent)"
                fillOpacity={0.4}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  borderColor: "var(--border)",
                  color: "var(--card-foreground)",
                  borderRadius: "0.5rem",
                  fontSize: "0.875rem",
                }}
                itemStyle={{ color: "var(--accent)" }}
              />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}