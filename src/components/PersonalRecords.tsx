"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount } from "@/components/AccountContext";

interface StreakData {
  current: number;
  longest: number;
  lastCommitDate: string | null;
  totalActiveDays: number;
}

interface ContributionData {
  days: number;
  total: number;
  data: Record<string, number>;
}

interface Repo {
  name: string;
  commits: number;
  url: string;
}

function getBestDay(data: Record<string, number>): { count: number; dateLabel: string | null } {
  let maxCount = 0;
  let bestDateStr: string | null = null;

  for (const [dateStr, count] of Object.entries(data)) {
    if (count > maxCount) {
      maxCount = count;
      bestDateStr = dateStr;
    }
  }

  let dateLabel: string | null = null;
  if (bestDateStr) {
    const parts = bestDateStr.split("-").map(Number);
    if (parts.length === 3) {
      const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
      dateLabel = d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      });
    } else {
      dateLabel = bestDateStr;
    }
  }

  return { count: maxCount, dateLabel };
}

function getBestWeek(data: Record<string, number>): { count: number; weekLabel: string | null } {
  const weeks: Record<string, number> = {};

  for (const [dateStr, count] of Object.entries(data)) {
    const parts = dateStr.split("-").map(Number);
    if (parts.length === 3) {
      const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
      const day = d.getUTCDay(); // 0 is Sunday, 1 is Monday
      const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // Monday week start
      const weekStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff));
      const weekStr = weekStart.toISOString().slice(0, 10);
      weeks[weekStr] = (weeks[weekStr] ?? 0) + count;
    }
  }

  let maxCount = 0;
  let bestWeekStr: string | null = null;

  for (const [weekStr, count] of Object.entries(weeks)) {
    if (count > maxCount) {
      maxCount = count;
      bestWeekStr = weekStr;
    }
  }

  let weekLabel: string | null = null;
  if (bestWeekStr) {
    const parts = bestWeekStr.split("-").map(Number);
    if (parts.length === 3) {
      const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
      weekLabel = `Week of ${d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      })}`;
    } else {
      weekLabel = bestWeekStr;
    }
  }

  return { count: maxCount, weekLabel };
}

function getBestMonth(data: Record<string, number>): { count: number; monthLabel: string | null } {
  const months: Record<string, number> = {};

  for (const [dateStr, count] of Object.entries(data)) {
    const monthKey = dateStr.slice(0, 7); // YYYY-MM
    months[monthKey] = (months[monthKey] ?? 0) + count;
  }

  let maxCount = 0;
  let bestMonthKey: string | null = null;

  for (const [mKey, count] of Object.entries(months)) {
    if (count > maxCount) {
      maxCount = count;
      bestMonthKey = mKey;
    }
  }

  let monthLabel: string | null = null;
  if (bestMonthKey) {
    const parts = bestMonthKey.split("-").map(Number);
    if (parts.length === 2) {
      const d = new Date(Date.UTC(parts[0], parts[1] - 1, 1));
      monthLabel = d.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      });
    } else {
      monthLabel = bestMonthKey;
    }
  }

  return { count: maxCount, monthLabel };
}

function getBusiestRepo(repos: Repo[]): { count: number; repoLabel: string | null } {
  if (!repos || repos.length === 0) {
    return { count: 0, repoLabel: null };
  }

  const best = repos[0];
  if (!best) {
    return { count: 0, repoLabel: null };
  }

  const shortName = best.name.split("/")[1] ?? best.name;
  return { count: best.commits, repoLabel: shortName };
}

export default function PersonalRecords() {
  const { selectedAccount } = useAccount();
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [contributions, setContributions] = useState<ContributionData | null>(null);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const paramStreak =
        selectedAccount !== null
          ? `?accountId=${encodeURIComponent(selectedAccount)}`
          : "";

      const paramContrib =
        selectedAccount !== null
          ? `&accountId=${encodeURIComponent(selectedAccount)}`
          : "";

      const [streakRes, contribRes, reposRes] = await Promise.all([
        fetch(`/api/metrics/streak${paramStreak}`),
        fetch(`/api/metrics/contributions?days=365${paramContrib}`),
        fetch(`/api/metrics/repos?days=365${paramContrib}`),
      ]);

      if (!streakRes.ok || !contribRes.ok || !reposRes.ok) {
        throw new Error("Failed to fetch personal records data");
      }

      const streakData = (await streakRes.json()) as StreakData;
      const contribData = (await contribRes.json()) as ContributionData;
      const reposData = (await reposRes.json()) as { repos: Repo[] };

      setStreak(streakData);
      setContributions(contribData);
      setRepos(reposData.repos ?? []);
    } catch {
      setError("We couldn't load your personal records right now. Please try again in a moment.");
    } finally {
      setLoading(false);
    }
  }, [selectedAccount]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const bestDay = getBestDay(contributions?.data ?? {});
  const bestWeek = getBestWeek(contributions?.data ?? {});
  const bestMonth = getBestMonth(contributions?.data ?? {});
  const busiestRepo = getBusiestRepo(repos);

  const records = [
    {
      label: "Longest Streak",
      value: streak?.longest ?? 0,
      unit: "days",
      subtext: "All time",
      icon: "🏆",
      isRepo: false,
    },
    {
      label: "Best Day",
      value: bestDay.count,
      unit: "commits",
      subtext: bestDay.dateLabel ?? "—",
      icon: "⚡",
      isRepo: false,
    },
    {
      label: "Best Week",
      value: bestWeek.count,
      unit: "commits",
      subtext: bestWeek.weekLabel ?? "—",
      icon: "🔥",
      isRepo: false,
    },
    {
      label: "Most Active Month",
      value: bestMonth.count,
      unit: "commits",
      subtext: bestMonth.monthLabel ?? "—",
      icon: "📅",
      isRepo: false,
    },
    {
      label: "Busiest Repo",
      value: busiestRepo.count,
      unit: "commits",
      subtext: busiestRepo.repoLabel ?? "—",
      icon: "⭐",
      isRepo: true,
    },
  ];

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-[var(--card-foreground)]">
        Personal Records
      </h2>
      {loading ? (
        <div
          role="status"
          aria-live="polite"
          aria-busy="true"
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 items-stretch"
        >
          <span className="sr-only">Loading personal records</span>
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              aria-hidden="true"
              className="h-32 rounded-lg bg-[var(--card-muted)] p-4 animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          <p>{error}</p>
          <button
            type="button"
            onClick={fetchRecords}
            className="mt-3 rounded-md border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/10"
          >
            Try again
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 items-stretch">
          {records.map((rec) => (
            <div
              key={rec.label}
              className="h-full rounded-lg bg-[var(--control)] p-4 text-center flex flex-col justify-between border border-transparent transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-[var(--accent)]/30"
            >
              <div>
                <div className="text-xl mb-2" role="img" aria-label={rec.label}>
                  {rec.icon}
                </div>
                <div className="text-3xl font-extrabold text-[var(--accent)] tracking-tight mb-1">
                  {rec.value}
                  <span className="ml-1 text-xs font-normal text-[var(--muted-foreground)] tracking-normal">
                    {rec.unit}
                  </span>
                </div>
                <div className="text-xs font-medium text-[var(--card-foreground)] opacity-90">
                  {rec.label}
                </div>
              </div>
              <div
                className={`mt-3 pt-2.5 border-t border-[var(--border)] text-xs truncate w-full block ${
                  rec.isRepo
                    ? "font-medium text-[var(--card-foreground)]"
                    : "text-[var(--muted-foreground)]"
                }`}
                title={rec.subtext}
              >
                {rec.subtext}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
