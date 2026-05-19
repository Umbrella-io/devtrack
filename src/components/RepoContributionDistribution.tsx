"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type RepoChartItem = {
  name: string;
  commits: number;
  percentage: number;
};

type ChartType = "pie" | "bar";

const COLORS = [
  "#6366f1",
  "#22c55e",
  "#f97316",
  "#06b6d4",
  "#ec4899",
  "#eab308",
  "#8b5cf6",
  "#14b8a6",
];

function normalizeRepos(payload: any): RepoChartItem[] {
  const repos = Array.isArray(payload) ? payload : payload?.repos || payload?.data || [];

  const mapped = repos
    .map((repo: any) => {
      const name =
        repo.name ||
        repo.repo ||
        repo.repository ||
        repo.full_name ||
        repo.fullName ||
        "Unknown repository";

      const commits =
        Number(
          repo.commits ??
            repo.commitCount ??
            repo.contributions ??
            repo.count ??
            repo.totalCommits ??
            0
        ) || 0;

      return { name, commits };
    })
    .filter((repo: { commits: number }) => repo.commits > 0)
    .sort((a: { commits: number }, b: { commits: number }) => b.commits - a.commits)
    .slice(0, 8);

  const total = mapped.reduce((sum: number, repo: { commits: number }) => sum + repo.commits, 0);

  return mapped.map((repo: { name: string; commits: number }) => ({
    ...repo,
    percentage: total > 0 ? Number(((repo.commits / total) * 100).toFixed(1)) : 0,
  }));
}

export default function RepoContributionDistribution({ days = 365 }: { days?: number }) {
  const [data, setData] = useState<RepoChartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [chartType, setChartType] = useState<ChartType>("pie");

  useEffect(() => {
    let cancelled = false;

    async function loadRepos() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`/api/metrics/repos?days=${days}`);

        if (!res.ok) {
          throw new Error("Failed to fetch repository metrics.");
        }

        const payload = await res.json();
        const normalized = normalizeRepos(payload);

        if (!cancelled) {
          setData(normalized);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load repository chart.");
          setData([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadRepos();

    return () => {
      cancelled = true;
    };
  }, [days]);

  const totalCommits = useMemo(
    () => data.reduce((sum, repo) => sum + repo.commits, 0),
    [data]
  );

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm backdrop-blur">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Repository Contribution Distribution</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Repo-wise contribution share based on recent commit activity.
          </p>
        </div>

        <div className="flex w-fit rounded-lg border border-white/10 bg-black/10 p-1 text-sm">
          <button
            type="button"
            onClick={() => setChartType("pie")}
            className={`rounded-md px-3 py-1 transition ${
              chartType === "pie" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            Pie
          </button>
          <button
            type="button"
            onClick={() => setChartType("bar")}
            className={`rounded-md px-3 py-1 transition ${
              chartType === "bar" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            Bar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-white/10 text-sm text-muted-foreground">
          Loading repository distribution...
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      ) : data.length === 0 ? (
        <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-white/10 text-sm text-muted-foreground">
          No repository contribution data available yet.
        </div>
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-black/10 p-3">
              <p className="text-xs text-muted-foreground">Repositories</p>
              <p className="text-xl font-semibold">{data.length}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/10 p-3">
              <p className="text-xs text-muted-foreground">Total commits</p>
              <p className="text-xl font-semibold">{totalCommits}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/10 p-3">
              <p className="text-xs text-muted-foreground">Top repo</p>
              <p className="truncate text-xl font-semibold">{data[0]?.name}</p>
            </div>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "pie" ? (
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="commits"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={105}
                    paddingAngle={2}
                    label={({ percentage }) => `${percentage}%`}
                  >
                    {data.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, _name, props: any) => [
                      `${value} commits (${props.payload.percentage}%)`,
                      props.payload.name,
                    ]}
                  />
                </PieChart>
              ) : (
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    formatter={(value: number, _name, props: any) => [
                      `${value} commits (${props.payload.percentage}%)`,
                      props.payload.name,
                    ]}
                  />
                  <Bar dataKey="commits" radius={[6, 6, 0, 0]}>
                    {data.map((_, index) => (
                      <Cell key={`bar-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </>
      )}
    </section>
  );
}
