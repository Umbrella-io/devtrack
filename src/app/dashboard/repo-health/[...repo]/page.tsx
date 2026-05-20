"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import type { RepoHealthScore, RepoHealthSignals } from "@/types/repo-health";

// Custom helper: get CSS variable on client
function getCSSVariable(varName: string): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
}

// -------------------------------------------------------------
// Scoring algorithms mirroring lib/repo-health.ts
// -------------------------------------------------------------
function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function scoreCommitFrequency(commits30d: number): number {
  const normalized = clamp(commits30d / 10, 0, 1);
  return normalized * 25;
}

function scorePrMergeRate(rate: number): number {
  return clamp(rate, 0, 1) * 25;
}

function scoreAvgPrOpenTimeHours(avgHours: number): number {
  if (avgHours <= 24) return 20;
  if (avgHours >= 168) return 0;
  const normalized = 1 - (avgHours - 24) / (168 - 24);
  return clamp(normalized, 0, 1) * 20;
}

function scoreOpenIssuesCount(openIssues: number): number {
  if (openIssues <= 0) return 15;
  if (openIssues >= 20) return 0;
  const normalized = 1 - openIssues / 20;
  return clamp(normalized, 0, 1) * 15;
}

function scoreDaysSinceLastCommit(days: number): number {
  if (days <= 7) return 15;
  if (days >= 30) return 0;
  const normalized = 1 - (days - 7) / (30 - 7);
  return clamp(normalized, 0, 1) * 15;
}

function gradeForScore(score: number): {
  grade: "A+" | "A" | "B" | "C" | "F";
  colorClass: string;
  gradientFrom: string;
  gradientTo: string;
  bgLightClass: string;
  badgeClass: string;
} {
  if (score >= 90) {
    return {
      grade: "A+",
      colorClass: "text-emerald-500 dark:text-emerald-400",
      gradientFrom: "#10b981",
      gradientTo: "#059669",
      bgLightClass: "bg-emerald-500/10 border-emerald-500/20",
      badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
    };
  }
  if (score >= 80) {
    return {
      grade: "A",
      colorClass: "text-green-500 dark:text-green-400",
      gradientFrom: "#22c55e",
      gradientTo: "#16a34a",
      bgLightClass: "bg-green-500/10 border-green-500/20",
      badgeClass: "bg-green-500/15 text-green-300 border-green-500/25",
    };
  }
  if (score >= 70) {
    return {
      grade: "B",
      colorClass: "text-amber-500 dark:text-amber-400",
      gradientFrom: "#f59e0b",
      gradientTo: "#d97706",
      bgLightClass: "bg-amber-500/10 border-amber-500/20",
      badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/25",
    };
  }
  if (score >= 50) {
    return {
      grade: "C",
      colorClass: "text-orange-500 dark:text-orange-400",
      gradientFrom: "#f97316",
      gradientTo: "#ea580c",
      bgLightClass: "bg-orange-500/10 border-orange-500/20",
      badgeClass: "bg-orange-500/15 text-orange-300 border-orange-500/25",
    };
  }
  return {
    grade: "F",
    colorClass: "text-rose-500 dark:text-rose-400",
    gradientFrom: "#ef4444",
    gradientTo: "#dc2626",
    bgLightClass: "bg-rose-500/10 border-rose-500/20",
    badgeClass: "bg-rose-500/15 text-rose-300 border-rose-500/25",
  };
}

interface ComputedResult {
  score: number;
  grade: "A+" | "A" | "B" | "C" | "F";
  fScore: number;
  mScore: number;
  tScore: number;
  iScore: number;
  dScore: number;
}

function computeCompositeScore(signals: RepoHealthSignals): ComputedResult {
  const fScore = scoreCommitFrequency(signals.commitFrequency);
  const mScore = scorePrMergeRate(signals.prMergeRate);
  const tScore = scoreAvgPrOpenTimeHours(signals.avgPrOpenTimeHours);
  const iScore = scoreOpenIssuesCount(signals.openIssuesCount);
  const dScore = scoreDaysSinceLastCommit(signals.daysSinceLastCommit);

  const total = Math.round(fScore + mScore + tScore + iScore + dScore);
  const clampedTotal = clamp(total, 0, 100);

  return {
    score: clampedTotal,
    grade: gradeForScore(clampedTotal).grade,
    fScore,
    mScore,
    tScore,
    iScore,
    dScore,
  };
}

export default function RepoHealthExplorer() {
  const params = useParams();
  const router = useRouter();
  const repoName = Array.isArray(params?.repo) ? params.repo.join("/") : "";

  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Live data state from API
  const [liveData, setLiveData] = useState<RepoHealthScore | null>(null);

  // Simulation mode states
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedSignals, setSimulatedSignals] = useState<RepoHealthSignals>({
    commitFrequency: 0,
    prMergeRate: 0,
    avgPrOpenTimeHours: 0,
    openIssuesCount: 0,
    daysSinceLastCommit: 0,
  });

  // Safeguard hydration for Recharts
  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchHealthData = useCallback(() => {
    if (!repoName) return;
    setLoading(true);
    setError(null);

    fetch(`/api/metrics/repo-health?repo=${encodeURIComponent(repoName)}&days=${days}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load repo health statistics.");
        return r.json();
      })
      .then((d: { repo?: RepoHealthScore; error?: string }) => {
        if (d.error) {
          setError(d.error);
        } else if (d.repo) {
          setLiveData(d.repo);
          setSimulatedSignals(d.repo.signals);
        } else {
          setError("No health data returned for this repository.");
        }
      })
      .catch((err) => {
        setError(err.message || "We couldn't retrieve the health signals at this time.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [repoName, days]);

  useEffect(() => {
    fetchHealthData();
  }, [fetchHealthData]);

  // Handle simulation toggle
  const toggleSimulation = () => {
    if (!isSimulating && liveData) {
      setSimulatedSignals(liveData.signals);
    }
    setIsSimulating(!isSimulating);
  };

  // Reset simulation back to live values
  const resetSimulation = () => {
    if (liveData) {
      setSimulatedSignals(liveData.signals);
    }
  };

  const handleSliderChange = (key: keyof RepoHealthSignals, value: number) => {
    setSimulatedSignals((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Determine which data to display
  const activeSignals = isSimulating
    ? simulatedSignals
    : liveData?.signals ?? {
        commitFrequency: 0,
        prMergeRate: 0,
        avgPrOpenTimeHours: 0,
        openIssuesCount: 0,
        daysSinceLastCommit: 0,
      };

  const computed = computeCompositeScore(activeSignals);
  const themeDetails = gradeForScore(computed.score);

  // SVG Gauge calculations
  const radius = 55;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (computed.score / 100) * circumference;

  // Prepare Radar Chart data
  const radarData = [
    { name: "Commit Frequency", value: Math.round(computed.fScore), max: 25 },
    { name: "PR Merge Rate", value: Math.round(computed.mScore), max: 25 },
    { name: "Avg PR Open Time", value: Math.round(computed.tScore), max: 20 },
    { name: "Open Issues Count", value: Math.round(computed.iScore), max: 15 },
    { name: "Recency of Activity", value: Math.round(computed.dScore), max: 15 },
  ];

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[var(--background)] p-4 md:p-8 text-[var(--foreground)]">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-60 rounded bg-[var(--card-muted)]" />
          <div className="h-40 rounded bg-[var(--card-muted)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] p-4 md:p-8 text-[var(--foreground)] transition-colors duration-200">
      {/* Dynamic SEO Title */}
      <title>{`${repoName.split("/")[1] ?? "Repository"} Health Explorer | DevTrack`}</title>

      {/* Header section with back links & actions */}
      <header className="mb-8 border-b border-[var(--border)] pb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
              <Link
                href="/dashboard"
                className="flex items-center gap-1 hover:text-[var(--foreground)] transition-colors group"
              >
                <svg
                  className="w-4 h-4 transform transition-transform group-hover:-translate-x-1"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
                Back to Dashboard
              </Link>
              <span>/</span>
              <span className="truncate">Repo Health Explorer</span>
            </div>
            <h1 className="flex flex-wrap items-center gap-3 text-2xl md:text-3xl font-bold tracking-tight">
              <span className="text-[var(--muted-foreground)] font-normal">
                {repoName.split("/")[0]}/
              </span>
              <span>{repoName.split("/")[1]}</span>
              <a
                href={`https://github.com/${repoName}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--muted-foreground)] hover:text-[var(--accent)] transition-colors"
                title="Open on GitHub"
              >
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </a>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              aria-label="Select dynamic metrics days range"
              className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] transition-colors shadow-sm"
              disabled={loading}
            >
              <option value={7}>Last 7 Days</option>
              <option value={30}>Last 30 Days</option>
              <option value={90}>Last 90 Days</option>
            </select>
            <button
              onClick={toggleSimulation}
              className={`px-3 py-1.5 rounded-lg border text-sm font-semibold transition-all shadow-sm ${
                isSimulating
                  ? "bg-purple-600/20 text-purple-300 border-purple-500/40 hover:bg-purple-600/30"
                  : "bg-[var(--card)] text-[var(--foreground)] border-[var(--border)] hover:bg-[var(--control)]"
              }`}
              disabled={loading || !!error}
            >
              {isSimulating ? "📊 Stop Simulation" : "🎛️ Simulation Mode"}
            </button>
          </div>
        </div>
      </header>

      {/* Main content body */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 h-[400px] animate-pulse" />
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 h-[300px] animate-pulse" />
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 h-[720px] animate-pulse" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-8 text-center max-w-2xl mx-auto shadow-md">
          <svg className="mx-auto w-12 h-12 text-red-400 mb-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <h3 className="text-lg font-semibold text-red-300 mb-2">Failed to load health metrics</h3>
          <p className="text-sm text-red-400 mb-6">{error}</p>
          <div className="flex justify-center gap-4">
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm text-[var(--foreground)] hover:bg-[var(--control)] transition-colors"
            >
              Back to Dashboard
            </Link>
            <button
              onClick={fetchHealthData}
              className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Try Again
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT SECTION: Overall health grade circle gauge + radar chart footprint */}
          <div className="lg:col-span-8 space-y-6">
            {/* Card 1: Score & Gauge Header */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3">
                {isSimulating ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-semibold text-purple-300 border border-purple-500/25 animate-pulse">
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                    SIMULATION ACTIVE
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 border border-emerald-500/25">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    LIVE DATA
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Left side overall gauge circle */}
                <div className="md:col-span-5 flex flex-col items-center justify-center p-4 border-b md:border-b-0 md:border-r border-[var(--border)]">
                  <div className="relative w-36 h-36">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                      {/* Inner shading */}
                      <circle
                        cx="60"
                        cy="60"
                        r={radius}
                        className="fill-none stroke-[var(--control)]"
                        strokeWidth={strokeWidth}
                        opacity={0.4}
                      />
                      {/* Main active circle with gradient */}
                      <circle
                        cx="60"
                        cy="60"
                        r={radius}
                        className="fill-none transition-all duration-700 ease-out"
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        stroke={`url(#gaugeGradient)`}
                      />
                      {/* Gradient definition */}
                      <defs>
                        <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor={themeDetails.gradientFrom} />
                          <stop offset="100%" stopColor={themeDetails.gradientTo} />
                        </linearGradient>
                      </defs>
                    </svg>
                    {/* Centered Grade Text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={`text-4xl font-extrabold tracking-tight ${themeDetails.colorClass}`}>
                        {themeDetails.grade}
                      </span>
                      <span className="text-xs text-[var(--muted-foreground)] mt-0.5">
                        {computed.score}/100 score
                      </span>
                    </div>
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-center">Composite Repository Health</h3>
                  <p className="text-xs text-[var(--muted-foreground)] text-center max-w-[200px] mt-1">
                    Based on commit count, PR activity, issues resolution rate, and contribution recency.
                  </p>
                </div>

                {/* Right side radar footprint */}
                <div className="md:col-span-7 flex flex-col h-[280px]">
                  <h4 className="text-sm font-semibold text-[var(--muted-foreground)] mb-2 px-2">
                    Health Footprint (Signal Balanced Scores)
                  </h4>
                  <div className="flex-1 w-full min-h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                        <PolarGrid stroke="var(--border)" opacity={0.4} />
                        <PolarAngleAxis
                          dataKey="name"
                          tick={{ fill: "var(--muted-foreground)", fontSize: 10, fontWeight: 500 }}
                        />
                        <PolarRadiusAxis
                          angle={30}
                          domain={[0, 25]}
                          tick={{ fill: "var(--muted-foreground)", fontSize: 8 }}
                          axisLine={false}
                        />
                        <Radar
                          name="Signal Score"
                          dataKey="value"
                          stroke={themeDetails.gradientFrom}
                          fill={themeDetails.gradientFrom}
                          fillOpacity={0.25}
                        />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: "var(--card)",
                            borderColor: "var(--border)",
                            color: "var(--card-foreground)",
                            borderRadius: "0.5rem",
                            fontSize: "12px",
                          }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row inside Left Section: Recommendations */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-[var(--accent)]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l8.904-4.43c.895-.448 1.617-1.17 2.065-2.065L21 9l-4.43 8.904a3.75 3.75 0 01-2.065 2.065L9.813 15.904z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 3.562a12.01 12.01 0 0110.438 10.438M9 3.562A8.02 8.02 0 001.5 12c0 4.14 3.36 7.5 7.5 7.5a8.02 8.02 0 007.5-7.5M9 3.562V12" />
                </svg>
                Actionable Improvement Recommendations
              </h2>

              <div className="space-y-4">
                {/* 1. Commit Frequency Component */}
                <div className={`p-4 rounded-lg border transition-all ${
                  computed.fScore === 0
                    ? "bg-rose-500/10 border-rose-500/20 text-rose-300"
                    : computed.fScore < 15
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-300"
                      : "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                }`}>
                  <div className="flex items-start gap-3">
                    <span className="text-xl shrink-0 mt-0.5">
                      {computed.fScore === 0 ? "🚨" : computed.fScore < 15 ? "⚠️" : "✅"}
                    </span>
                    <div>
                      <h4 className="font-semibold text-sm text-[var(--foreground)]">
                        Commit Frequency: {activeSignals.commitFrequency} commits in {days}d ({Math.round(computed.fScore)}/25)
                      </h4>
                      <p className="text-xs text-[var(--muted-foreground)] mt-1">
                        {computed.fScore === 0
                          ? "Zero commit activity detected! This repository is completely idle. Start pushing initial blocks, README enhancements, or split your tasks into smaller chunks."
                          : computed.fScore < 15
                            ? "Low commit rate. Try to establish a habit of committing early and often. Break down large pull requests into smaller commits for clearer reviews."
                            : "Excellent work! You maintain a steady flow of commits, reflecting consistent repository momentum."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. PR Merge Rate Component */}
                <div className={`p-4 rounded-lg border transition-all ${
                  activeSignals.prMergeRate < 0.3 && computed.mScore > 0
                    ? "bg-rose-500/10 border-rose-500/20 text-rose-300"
                    : computed.mScore < 18
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-300"
                      : "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                }`}>
                  <div className="flex items-start gap-3">
                    <span className="text-xl shrink-0 mt-0.5">
                      {activeSignals.prMergeRate < 0.3 && computed.mScore > 0 ? "🚨" : computed.mScore < 18 ? "⚠️" : "✅"}
                    </span>
                    <div>
                      <h4 className="font-semibold text-sm text-[var(--foreground)]">
                        PR Merge Rate: {Math.round(activeSignals.prMergeRate * 100)}% ({Math.round(computed.mScore)}/25)
                      </h4>
                      <p className="text-xs text-[var(--muted-foreground)] mt-1">
                        {activeSignals.prMergeRate < 0.3
                          ? "PR cycle is clogged! Less than 30% of opened PRs are being merged. Prioritize review times, unblock team discussions, and resolve standing conflicts."
                          : computed.mScore < 18
                            ? "Moderately low PR merge rate. Focus on driving outstanding drafts to resolution before opening new streams of work."
                            : "Superb PR health! Your open pull requests are successfully and efficiently getting merged into production."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Average PR Open Time Component */}
                <div className={`p-4 rounded-lg border transition-all ${
                  activeSignals.avgPrOpenTimeHours > 120
                    ? "bg-rose-500/10 border-rose-500/20 text-rose-300"
                    : computed.tScore < 15
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-300"
                      : "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                }`}>
                  <div className="flex items-start gap-3">
                    <span className="text-xl shrink-0 mt-0.5">
                      {activeSignals.avgPrOpenTimeHours > 120 ? "🚨" : computed.tScore < 15 ? "⚠️" : "✅"}
                    </span>
                    <div>
                      <h4 className="font-semibold text-sm text-[var(--foreground)]">
                        Avg PR Resolution Time: {Math.round(activeSignals.avgPrOpenTimeHours)} hours ({Math.round(computed.tScore)}/20)
                      </h4>
                      <p className="text-xs text-[var(--muted-foreground)] mt-1">
                        {activeSignals.avgPrOpenTimeHours > 120
                          ? `Yellow Alert: Average PR open time is ${Math.round(activeSignals.avgPrOpenTimeHours)} hours. Try setting up pull-request review reminders, or breaking up your PRs into smaller, bite-sized commits to bring this down.`
                          : computed.tScore < 15
                            ? `PRs are staying open for an average of ${Math.round(activeSignals.avgPrOpenTimeHours)} hours. Try reviewing drafts faster and keep review conversations focused.`
                            : "Incredible velocity! Pull requests are merged or resolved rapidly, resulting in an agile workflow."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4. Open Issues Component */}
                <div className={`p-4 rounded-lg border transition-all ${
                  activeSignals.openIssuesCount >= 20
                    ? "bg-rose-500/10 border-rose-500/20 text-rose-300"
                    : computed.iScore < 12
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-300"
                      : "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                }`}>
                  <div className="flex items-start gap-3">
                    <span className="text-xl shrink-0 mt-0.5">
                      {activeSignals.openIssuesCount >= 20 ? "🚨" : computed.iScore < 12 ? "⚠️" : "✅"}
                    </span>
                    <div>
                      <h4 className="font-semibold text-sm text-[var(--foreground)]">
                        Open Issues: {activeSignals.openIssuesCount} issues ({Math.round(computed.iScore)}/15)
                      </h4>
                      <p className="text-xs text-[var(--muted-foreground)] mt-1">
                        {activeSignals.openIssuesCount >= 20
                          ? `High issue backlog (${activeSignals.openIssuesCount} open)! Stale issues clutter project clarity. Triage old reports, close resolved tasks, and filter active streams.`
                          : computed.iScore < 12
                            ? `You have ${activeSignals.openIssuesCount} open issues. Aim to organize a backlog pruning session to label bugs and close outdated chores.`
                            : "Excellent issue hygiene! Outstandings are kept at a minimum, allowing developers to focus on what matters."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 5. Last Commit Recency Component */}
                <div className={`p-4 rounded-lg border transition-all ${
                  activeSignals.daysSinceLastCommit > 30
                    ? "bg-rose-500/10 border-rose-500/20 text-rose-300"
                    : computed.dScore < 12
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-300"
                      : "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                }`}>
                  <div className="flex items-start gap-3">
                    <span className="text-xl shrink-0 mt-0.5">
                      {activeSignals.daysSinceLastCommit > 30 ? "🚨" : computed.dScore < 12 ? "⚠️" : "✅"}
                    </span>
                    <div>
                      <h4 className="font-semibold text-sm text-[var(--foreground)]">
                        Recency of Activity: Last commit was {activeSignals.daysSinceLastCommit === 9999 ? "never" : `${activeSignals.daysSinceLastCommit} days ago`} ({Math.round(computed.dScore)}/15)
                      </h4>
                      <p className="text-xs text-[var(--muted-foreground)] mt-1">
                        {activeSignals.daysSinceLastCommit > 30
                          ? "Critical risk of stagnation! The last commit was over a month ago. Make a small update or chore bump to restore heartbeat momentum!"
                          : computed.dScore < 12
                            ? `Last commit was ${activeSignals.daysSinceLastCommit} days ago. Push a quick fix or comment soon to maintain consistent momentum.`
                            : "Highly active! Contributions are extremely recent, demonstrating active interest and constant health."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SECTION: Dynamic Sliders health simulator controls */}
          <div className="lg:col-span-4 space-y-6">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Health Score Simulator</h2>
                {isSimulating && (
                  <button
                    onClick={resetSimulation}
                    className="text-xs font-semibold text-[var(--accent)] hover:opacity-80 transition-opacity"
                    title="Revert simulation changes to active github metrics"
                  >
                    Reset Live
                  </button>
                )}
              </div>

              <p className="text-xs text-[var(--muted-foreground)] mb-6">
                {!isSimulating
                  ? "Toggle Simulation Mode in the top header to manually slide values and see how specific actions immediately impact repository grade, scores, footprint, and feedback."
                  : "Drag the sliders below to simulate metric improvements or regressions. Your dashboard updates in real time!"}
              </p>

              {/* Slider list */}
              <div className="space-y-6">
                {/* CF Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[var(--muted-foreground)]">Commit Frequency</span>
                    <span className="font-semibold text-[var(--foreground)] bg-[var(--control)] px-1.5 py-0.5 rounded">
                      {activeSignals.commitFrequency} commits
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="1"
                    disabled={!isSimulating}
                    value={activeSignals.commitFrequency}
                    onChange={(e) => handleSliderChange("commitFrequency", Number(e.target.value))}
                    className="w-full h-1 bg-[var(--control)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <div className="flex items-center justify-between text-[10px] text-[var(--muted-foreground)]">
                    <span>0 commits (0 pts)</span>
                    <span>10+ commits (25 pts)</span>
                  </div>
                </div>

                {/* MR Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[var(--muted-foreground)]">PR Merge Rate</span>
                    <span className="font-semibold text-[var(--foreground)] bg-[var(--control)] px-1.5 py-0.5 rounded">
                      {Math.round(activeSignals.prMergeRate * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    disabled={!isSimulating}
                    value={activeSignals.prMergeRate}
                    onChange={(e) => handleSliderChange("prMergeRate", Number(e.target.value))}
                    className="w-full h-1 bg-[var(--control)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <div className="flex items-center justify-between text-[10px] text-[var(--muted-foreground)]">
                    <span>0% (0 pts)</span>
                    <span>100% (25 pts)</span>
                  </div>
                </div>

                {/* PT Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[var(--muted-foreground)]">Avg PR Open Time</span>
                    <span className="font-semibold text-[var(--foreground)] bg-[var(--control)] px-1.5 py-0.5 rounded">
                      {Math.round(activeSignals.avgPrOpenTimeHours)} hours
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    step="4"
                    disabled={!isSimulating}
                    value={activeSignals.avgPrOpenTimeHours}
                    onChange={(e) => handleSliderChange("avgPrOpenTimeHours", Number(e.target.value))}
                    className="w-full h-1 bg-[var(--control)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <div className="flex items-center justify-between text-[10px] text-[var(--muted-foreground)]">
                    <span>&lt;24h (20 pts)</span>
                    <span>168h+ (0 pts)</span>
                  </div>
                </div>

                {/* OI Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[var(--muted-foreground)]">Open Issues Count</span>
                    <span className="font-semibold text-[var(--foreground)] bg-[var(--control)] px-1.5 py-0.5 rounded">
                      {activeSignals.openIssuesCount} issues
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    step="1"
                    disabled={!isSimulating}
                    value={activeSignals.openIssuesCount}
                    onChange={(e) => handleSliderChange("openIssuesCount", Number(e.target.value))}
                    className="w-full h-1 bg-[var(--control)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <div className="flex items-center justify-between text-[10px] text-[var(--muted-foreground)]">
                    <span>0 issues (15 pts)</span>
                    <span>20+ issues (0 pts)</span>
                  </div>
                </div>

                {/* DS Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[var(--muted-foreground)]">Last Commit Recency</span>
                    <span className="font-semibold text-[var(--foreground)] bg-[var(--control)] px-1.5 py-0.5 rounded">
                      {activeSignals.daysSinceLastCommit === 9999
                        ? "never"
                        : `${activeSignals.daysSinceLastCommit} days`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="45"
                    step="1"
                    disabled={!isSimulating}
                    value={activeSignals.daysSinceLastCommit === 9999 ? 45 : activeSignals.daysSinceLastCommit}
                    onChange={(e) => handleSliderChange("daysSinceLastCommit", Number(e.target.value))}
                    className="w-full h-1 bg-[var(--control)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <div className="flex items-center justify-between text-[10px] text-[var(--muted-foreground)]">
                    <span>&lt;7 days (15 pts)</span>
                    <span>30+ days (0 pts)</span>
                  </div>
                </div>
              </div>

              {/* Extra visual indicators */}
              {isSimulating && (
                <div className="mt-8 p-4 rounded-lg bg-[var(--control)] border border-[var(--border)] text-[var(--muted-foreground)] text-[11px] space-y-2">
                  <p className="font-semibold text-[var(--foreground)] flex items-center gap-1.5">
                    💡 Simulated Improvement Opportunity
                  </p>
                  <p>
                    You are simulating an A/B environment. You can see how lowering PR cycle time by
                    drafting smaller changes directly bumps your total score, leading to a much
                    stronger grade.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
