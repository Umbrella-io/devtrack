"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { Sparkles, GitCommit, GitPullRequest, GitMerge, CheckCircle, Flame, Star, Calendar } from "lucide-react";
import { useAccount } from "@/components/AccountContext";
import { Skeleton } from "@/components/Skeleton";

interface WeeklySummaryData {
  commits: { current: number; previous: number; delta: number; trend: "up" | "down" | "same" };
  prs: { thisWeek: { opened: number; merged: number }; lastWeek: { opened: number; merged: number } };
  issues: { thisWeek: number; lastWeek: number };
  activeDays: { thisWeek: number; lastWeek: number };
  streak: number;
  topRepo: string | null;
}

interface CodingInsightData {
  mostActiveDay?: { day: string; count: number };
}

function StatBox({ icon: Icon, label, value, trendLabel, trendUp }: { icon: any; label: string; value: string | number; trendLabel?: string; trendUp?: boolean }) {
  return (
    <div className="rounded-lg bg-[var(--control)] p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
        <Icon className="h-4 w-4" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold text-[var(--card-foreground)]">{value}</span>
        {trendLabel && (
          <span className={`text-xs font-medium ${trendUp ? "text-[var(--success)]" : trendUp === false ? "text-[var(--destructive)]" : "text-[var(--muted-foreground)]"}`}>
            {trendLabel}
          </span>
        )}
      </div>
    </div>
  );
}

function HighlightRow({ icon: Icon, title, value }: { icon: any; title: string; value: string | number }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--card-muted)]">
      <div className="rounded-full bg-[var(--accent)]/10 p-2 text-[var(--accent)]">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex flex-col">
        <span className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">{title}</span>
        <span className="text-sm font-semibold text-[var(--card-foreground)]">{value}</span>
      </div>
    </div>
  );
}

export default function WeeklyCodingInsightsCard() {
  const { selectedAccount } = useAccount();
  const [summary, setSummary] = useState<WeeklySummaryData | null>(null);
  const [insights, setInsights] = useState<CodingInsightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const requestIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const requestId = ++requestIdRef.current;

    const params = new URLSearchParams();
    if (selectedAccount !== null) {
      params.set("accountId", selectedAccount);
    }
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    params.set("timeZone", tz);

    try {
      const [summaryRes, insightsRes] = await Promise.all([
        fetch(`/api/metrics/weekly-summary?${params.toString()}`),
        fetch(`/api/metrics/coding-activity-insights?${params.toString()}`)
      ]);

      if (requestId !== requestIdRef.current) return;

      if (!summaryRes.ok) throw new Error("Failed to load summary");
      
      const summaryData = await summaryRes.json();
      setSummary(summaryData);

      if (insightsRes.ok) {
        const insightsData = await insightsRes.json();
        setInsights(insightsData);
      }
    } catch (err) {
      if (requestId === requestIdRef.current) {
        setError("Failed to load weekly insights.");
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [selectedAccount]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm space-y-4">
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
        </div>
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[var(--card-foreground)] mb-4">Weekly Coding Insights</h2>
        <div className="rounded-lg border border-[var(--destructive)]/20 bg-[var(--destructive)]/10 p-4 text-sm text-[var(--destructive)]">
          {error}
          <button onClick={fetchData} className="ml-3 underline">Try again</button>
        </div>
      </div>
    );
  }

  const hasActivity = summary && (summary.commits.current > 0 || summary.prs.thisWeek.opened > 0 || summary.prs.thisWeek.merged > 0 || summary.issues.thisWeek > 0);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="h-5 w-5 text-[var(--accent)]" />
        <h2 className="text-lg font-semibold text-[var(--card-foreground)]">Weekly Coding Insights</h2>
      </div>

      {!hasActivity ? (
        <div className="flex flex-col items-center justify-center py-10 text-center rounded-lg border border-dashed border-[var(--border)] bg-[var(--card-muted)] px-4">
          <div className="rounded-full bg-[var(--control)] p-4 mb-4">
            <Sparkles className="h-8 w-8 text-[var(--muted-foreground)]" />
          </div>
          <h3 className="text-base font-semibold text-[var(--card-foreground)]">No activity this week</h3>
          <p className="mt-1 text-sm text-[var(--muted-foreground)] max-w-sm">
            It looks like you haven't made any commits, opened PRs, or closed issues in the past 7 days. Time to get coding!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatBox 
              icon={GitCommit} 
              label="Commits" 
              value={summary!.commits.current} 
              trendLabel={summary!.commits.trend !== 'same' ? `${summary!.commits.trend === 'up' ? '+' : '-'}${Math.abs(summary!.commits.delta)}` : undefined}
              trendUp={summary!.commits.trend === 'up'}
            />
            <StatBox 
              icon={GitPullRequest} 
              label="PRs Opened" 
              value={summary!.prs.thisWeek.opened} 
            />
            <StatBox 
              icon={GitMerge} 
              label="PRs Merged" 
              value={summary!.prs.thisWeek.merged} 
            />
            <StatBox 
              icon={CheckCircle} 
              label="Issues Closed" 
              value={summary!.issues.thisWeek} 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {insights?.mostActiveDay ? (
              <HighlightRow 
                icon={Calendar} 
                title="Most Productive Day" 
                value={insights.mostActiveDay.day} 
              />
            ) : (
              <HighlightRow 
                icon={Calendar} 
                title="Active Days" 
                value={`${summary!.activeDays.thisWeek} / 7`} 
              />
            )}
            
            <HighlightRow 
              icon={Star} 
              title="Most Active Repo" 
              value={summary!.topRepo || "None"} 
            />
            
            <HighlightRow 
              icon={Flame} 
              title="Commit Streak" 
              value={`${summary!.streak} Days`} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
