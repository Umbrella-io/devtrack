"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount } from "@/components/AccountContext";
import { signOut } from "next-auth/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import {
  GitCommit,
  GitPullRequest,
  CheckCircle,
  FolderGit2,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Award,
  Activity,
  Flame,
} from "lucide-react";

interface WeeklySummaryData {
  commits: {
    current: number;
    previous: number;
    delta: number;
    trend: "up" | "down" | "same";
  };
  prs: {
    thisWeek: { opened: number; merged: number };
    lastWeek: { opened: number; merged: number };
  };
  activeDays: {
    thisWeek: number;
    lastWeek: number;
  };
  streak: number;
  topRepo: string | null;
  dailyCommits?: Array<{ date: string; count: number }>;
  repositoriesContributedTo?: number;
}

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDayName(dateString: string) {
  const d = new Date(dateString);
  return DAYS_OF_WEEK[d.getUTCDay()];
}

export default function WeeklyProductivityDashboard() {
  const { selectedAccount } = useAccount();
  const [summary, setSummary] = useState<WeeklySummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [githubAuthInvalid, setGithubAuthInvalid] = useState(false);

  const fetchSummary = useCallback(() => {
    setLoading(true);
    setError(null);
    setGithubAuthInvalid(false);

    const url =
      selectedAccount !== null
        ? `/api/metrics/weekly-summary?accountId=${encodeURIComponent(selectedAccount)}`
        : "/api/metrics/weekly-summary";

    fetch(url)
      .then(async (r) => {
        const data = await r.json();
        if (data?.error === "token_expired") {
          setGithubAuthInvalid(true);
          return null;
        }
        if (!r.ok) throw new Error("API error");
        return data as WeeklySummaryData;
      })
      .then((data) => {
        if (!data) return;
        setSummary(data);
      })
      .catch(() =>
        setError(
          "We couldn't load your weekly summary right now. Please try again in a moment.",
        ),
      )
      .finally(() => setLoading(false));
  }, [selectedAccount]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  if (loading) {
    return (
      <div
        role="status"
        aria-busy="true"
        className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm flex flex-col gap-6"
      >
        <div className="h-8 w-48 bg-[var(--card-muted)] rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-[var(--card-muted)] rounded animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-[var(--card-muted)] rounded animate-pulse" />
          <div className="h-64 bg-[var(--card-muted)] rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (githubAuthInvalid) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 text-center space-y-3 shadow-sm">
        <p className="text-sm text-[var(--muted-foreground)]">
          Your GitHub connection is no longer valid. Reconnect your GitHub
          account to continue syncing data.
        </p>
        <button
          type="button"
          onClick={() => {
            void signOut({ redirect: false }).then(() => {
              window.location.href = "/api/auth/signin/github?callbackUrl=/dashboard";
            });
          }}
          className="inline-flex items-center rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Reconnect GitHub
        </button>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="rounded-xl border border-[var(--destructive)]/20 bg-[var(--destructive)]/10 p-6 text-center text-sm text-[var(--destructive)] shadow-sm">
        {error || "No data available."}
      </div>
    );
  }

  const { commits, prs, activeDays, dailyCommits = [], repositoriesContributedTo = 0 } = summary;

  // Formatting chart data
  const chartData = dailyCommits.map((d) => ({
    name: getDayName(d.date),
    commits: d.count,
    fullDate: d.date,
  }));

  // Calculate insights
  const mostProductiveDay = chartData.reduce(
    (max, current) => (current.commits > max.commits ? current : max),
    { name: "N/A", commits: -1 }
  );

  const highestContributionCount = mostProductiveDay.commits > -1 ? mostProductiveDay.commits : 0;
  
  const consistencyPercent = Math.round((activeDays.thisWeek / 7) * 100);

  const renderTrend = (current: number, previous: number) => {
    const delta = current - previous;
    const isUp = delta > 0;
    const isDown = delta < 0;
    
    let percentage = 0;
    if (previous === 0 && current > 0) percentage = 100;
    else if (previous > 0) percentage = Math.round(Math.abs((delta / previous) * 100));

    if (isUp) {
      return (
        <span className="flex items-center text-xs font-medium text-[var(--success)] bg-[var(--success)]/10 px-1.5 py-0.5 rounded">
          <TrendingUp className="mr-1 h-3 w-3" />
          +{percentage}%
        </span>
      );
    } else if (isDown) {
      return (
        <span className="flex items-center text-xs font-medium text-[var(--destructive)] bg-[var(--destructive)]/10 px-1.5 py-0.5 rounded">
          <TrendingDown className="mr-1 h-3 w-3" />
          -{percentage}%
        </span>
      );
    }
    return (
      <span className="flex items-center text-xs font-medium text-[var(--muted-foreground)] bg-[var(--muted-foreground)]/10 px-1.5 py-0.5 rounded">
        <Minus className="mr-1 h-3 w-3" />
        0%
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric Cards */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-[var(--muted-foreground)] flex items-center gap-2">
              <GitCommit className="h-4 w-4" /> Total Commits
            </h3>
            {renderTrend(commits.current, commits.previous)}
          </div>
          <p className="text-3xl font-bold text-[var(--card-foreground)]">
            {commits.current}
          </p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            vs {commits.previous} last week
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-[var(--muted-foreground)] flex items-center gap-2">
              <GitPullRequest className="h-4 w-4" /> Pull Requests
            </h3>
            {renderTrend(prs.thisWeek.opened, prs.lastWeek.opened)}
          </div>
          <p className="text-3xl font-bold text-[var(--card-foreground)]">
            {prs.thisWeek.opened}
          </p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            {prs.thisWeek.merged} merged this week
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-[var(--muted-foreground)] flex items-center gap-2">
              <FolderGit2 className="h-4 w-4" /> Repositories
            </h3>
          </div>
          <p className="text-3xl font-bold text-[var(--card-foreground)]">
            {repositoriesContributedTo}
          </p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            Contributed to this week
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm transition-all hover:shadow-md relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 text-[var(--accent)]/5 transition-transform group-hover:scale-110 group-hover:rotate-12 duration-500">
            <Flame className="w-24 h-24" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-[var(--muted-foreground)] flex items-center gap-2">
                <Activity className="h-4 w-4" /> Active Days
              </h3>
              {renderTrend(activeDays.thisWeek, activeDays.lastWeek)}
            </div>
            <p className="text-3xl font-bold text-[var(--card-foreground)]">
              {activeDays.thisWeek} <span className="text-lg text-[var(--muted-foreground)] font-normal">/ 7</span>
            </p>
            <div className="mt-2 h-1.5 w-full bg-[var(--border)] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[var(--accent)] transition-all duration-1000 ease-out"
                style={{ width: `${consistencyPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts */}
        <div className="lg:col-span-2 rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-[var(--card-foreground)] mb-6 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[var(--accent)]" /> Daily Activity & Commits
          </h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tickMargin={10} 
                  style={{ fill: "var(--muted-foreground)", fontSize: "0.8rem" }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tickMargin={10} 
                  style={{ fill: "var(--muted-foreground)", fontSize: "0.8rem" }} 
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "0.5rem",
                    color: "var(--card-foreground)",
                  }}
                  itemStyle={{ color: "var(--accent)", fontWeight: 600 }}
                  labelStyle={{ color: "var(--muted-foreground)", marginBottom: "4px" }}
                />
                <Line
                  type="monotone"
                  dataKey="commits"
                  name="Commits"
                  stroke="var(--accent)"
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2, fill: "var(--card)" }}
                  activeDot={{ r: 6, strokeWidth: 0, fill: "var(--accent)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Insights */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm flex flex-col">
          <h3 className="text-lg font-semibold text-[var(--card-foreground)] mb-6 flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" /> Productivity Insights
          </h3>
          
          <div className="flex-1 space-y-5">
            <div className="flex items-start gap-4">
              <div className="bg-[var(--control)] p-2 rounded-lg text-[var(--accent)]">
                <Flame className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--card-foreground)]">Most Productive Day</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  {mostProductiveDay.name !== "N/A" 
                    ? `${mostProductiveDay.name} with ${highestContributionCount} commits`
                    : "Not enough data"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-[var(--control)] p-2 rounded-lg text-[var(--success)]">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--card-foreground)]">Consistency Score</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  {consistencyPercent}% active days this week
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-[var(--control)] p-2 rounded-lg text-blue-500">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--card-foreground)]">Weekly Trend</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  {commits.trend === "up" 
                    ? "Upward trajectory compared to last week" 
                    : commits.trend === "down" 
                      ? "Slightly behind last week's pace"
                      : "Maintaining a steady pace"}
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="bg-[var(--control)] p-2 rounded-lg text-purple-500">
                <FolderGit2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--card-foreground)]">Top Repository</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5 truncate max-w-[200px]">
                  {summary.topRepo ? summary.topRepo : "No contributions yet"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
