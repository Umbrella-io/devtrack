"use client";

import { memo, useMemo } from "react";
import type { RepoHealthScore } from "@/types/repo-health";
import {
  scoreCommitFrequency,
  scorePrMergeRate,
  scoreAvgPrOpenTimeHours,
  scoreOpenIssuesCount,
  scoreDaysSinceLastCommit,
} from "@/lib/repo-health";

interface MetricConfig {
  key: string;
  label: string;
  score: number;
  maxScore: number;
  rawValue: string;
  tip: string;
  weight: string;
}

interface RepoHealthExplorerProps {
  health: RepoHealthScore;
  isOpen: boolean;
  onClose: () => void;
}

function GradeRing({ score, grade }: { score: number; grade: string }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color =
    grade === "green" ? "var(--success)"
    : grade === "yellow" ? "var(--warning)"
    : "var(--destructive)";
  const letter = grade === "green" ? "A" : grade === "yellow" ? "B" : "C";
  return (
    <div className="relative flex items-center justify-center" style={{ width: 88, height: 88 }}>
      <svg width="88" height="88" className="-rotate-90" aria-hidden="true">
        <circle cx="44" cy="44" r={r} fill="none" stroke="var(--border)" strokeWidth="8" />
        <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-xl font-bold" style={{ color }}>{score}</span>
        <span className="text-[10px] font-semibold" style={{ color }}>Grade {letter}</span>
      </div>
    </div>
  );
}

function MetricBar({ metric }: { metric: MetricConfig }) {
  const pct = Math.round((metric.score / metric.maxScore) * 100);
  const barClass = pct >= 70 ? "bg-[var(--success)]" : pct >= 40 ? "bg-[var(--warning)]" : "bg-[var(--destructive)]";
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_60%,transparent)] p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[var(--card-foreground)] truncate">{metric.label}</p>
          <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">{metric.rawValue}</p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-sm font-bold text-[var(--card-foreground)]">{metric.score.toFixed(0)}</span>
          <span className="text-[11px] text-[var(--muted-foreground)]">&thinsp;/ {metric.maxScore}</span>
          <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">{metric.weight}</p>
        </div>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--control)]">
        <div className={`h-full rounded-full transition-all duration-500 ${barClass}`} style={{ width: `${pct}%` }} />
      </div>
      {metric.tip && <p className="text-[11px] leading-snug text-[var(--muted-foreground)]">{metric.tip}</p>}
    </div>
  );
}

function RecBadge({ text, level }: { text: string; level: "ok" | "warn" | "critical" }) {
  const cls: Record<string, string> = {
    ok:       "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20",
    warn:     "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20",
    critical: "bg-[var(--destructive)]/10 text-[var(--destructive)] border-[var(--destructive)]/20",
  };
  const prefix: Record<string, string> = { ok: "✅", warn: "🟡", critical: "🔴" };
  return (
    <div className={`rounded-lg border px-3 py-2 text-xs leading-relaxed ${cls[level]}`}>
      {prefix[level]} {text}
    </div>
  );
}

const RepoHealthExplorer = memo(function RepoHealthExplorer({ health, isOpen, onClose }: RepoHealthExplorerProps) {
  const s = health.signals;
  const shortName = health.repo.split("/")[1] ?? health.repo;

  const metrics: MetricConfig[] = useMemo(() => [
    {
      key: "commits", label: "Commit Frequency",
      score: scoreCommitFrequency(s.commitFrequency), maxScore: 25,
      rawValue: `${s.commitFrequency} commit${s.commitFrequency !== 1 ? "s" : ""} in last 30 days`,
      tip: s.commitFrequency < 5 ? "Low activity. Aim for 10+ commits/month."
         : s.commitFrequency < 10 ? "Moderate. 10+ commits/month maximizes this score."
         : "Great commit frequency – repository is actively developed.",
      weight: "25 pts",
    },
    {
      key: "pr-merge", label: "PR Merge Rate",
      score: scorePrMergeRate(s.prMergeRate), maxScore: 25,
      rawValue: `${Math.round(s.prMergeRate * 100)}% of opened PRs merged`,
      tip: s.prMergeRate < 0.4 ? "Many PRs going unmerged. Review stale PRs."
         : s.prMergeRate < 0.7 ? "Decent merge rate. Aim for 70%+."
         : "Excellent merge rate – contributors' work integrated effectively.",
      weight: "25 pts",
    },
    {
      key: "pr-time", label: "PR Turnaround",
      score: scoreAvgPrOpenTimeHours(s.avgPrOpenTimeHours), maxScore: 20,
      rawValue: s.avgPrOpenTimeHours === 0 ? "No closed PRs yet" : `Avg ${Math.round(s.avgPrOpenTimeHours)}h open before close`,
      tip: s.avgPrOpenTimeHours > 168 ? "PRs open over a week. Enable review reminders."
         : s.avgPrOpenTimeHours > 48 ? "PRs take 2-7 days. Target under 24h."
         : "Fast PR turnaround – review loop is tight.",
      weight: "20 pts",
    },
    {
      key: "issues", label: "Open Issue Load",
      score: scoreOpenIssuesCount(s.openIssuesCount), maxScore: 15,
      rawValue: `${s.openIssuesCount} open issue${s.openIssuesCount !== 1 ? "s" : ""}`,
      tip: s.openIssuesCount >= 20 ? "Very high backlog. Triage stale issues."
         : s.openIssuesCount >= 10 ? "Backlog growing. Keep below 10."
         : "Healthy issue backlog.",
      weight: "15 pts",
    },
    {
      key: "recency", label: "Recent Activity",
      score: scoreDaysSinceLastCommit(s.daysSinceLastCommit), maxScore: 15,
      rawValue: `Last commit ${s.daysSinceLastCommit} day${s.daysSinceLastCommit !== 1 ? "s" : ""} ago`,
      tip: s.daysSinceLastCommit > 30 ? `No commits in ${s.daysSinceLastCommit} days. Revive activity.`
         : s.daysSinceLastCommit > 7 ? "Activity slowed. Commit within 7 days for max score."
         : "Repository is actively maintained.",
      weight: "15 pts",
    },
  ], [s]);

  const recs = useMemo(() => {
    const list: Array<{ text: string; level: "ok" | "warn" | "critical" }> = [];
    if (s.commitFrequency < 3) list.push({ level: "critical", text: `Only ${s.commitFrequency} commits in 30 days – repository may be going stale.` });
    else if (s.commitFrequency < 10) list.push({ level: "warn", text: `${s.commitFrequency} commits/month. Aim for 10+ to show sustained development.` });
    else list.push({ level: "ok", text: "Commit frequency is healthy." });
    if (s.prMergeRate < 0.4) list.push({ level: "critical", text: `PR merge rate is only ${Math.round(s.prMergeRate * 100)}%. Merge or close stale PRs.` });
    else if (s.prMergeRate < 0.7) list.push({ level: "warn", text: `PR merge rate is ${Math.round(s.prMergeRate * 100)}%. Aim for 70%+.` });
    if (s.avgPrOpenTimeHours > 168) list.push({ level: "critical", text: `Average PR open for ${Math.round(s.avgPrOpenTimeHours / 24)} days. Enable review reminders.` });
    else if (s.avgPrOpenTimeHours > 48) list.push({ level: "warn", text: `Avg PR turnaround ${Math.round(s.avgPrOpenTimeHours)}h. Target under 24h.` });
    if (s.openIssuesCount >= 20) list.push({ level: "critical", text: `${s.openIssuesCount} open issues is very high. Triage your backlog.` });
    else if (s.openIssuesCount >= 10) list.push({ level: "warn", text: `${s.openIssuesCount} open issues. Keep below 10.` });
    if (s.daysSinceLastCommit > 30) list.push({ level: "critical", text: `No commits in ${s.daysSinceLastCommit} days – repository may be inactive.` });
    else if (s.daysSinceLastCommit > 7) list.push({ level: "warn", text: `Last commit ${s.daysSinceLastCommit} days ago. Aim for weekly activity.` });
    return list;
  }, [s]);

  const trend = health.score >= 70 ? "▲ Improving" : health.score >= 40 ? "→ Stable" : "▼ Declining";
  const trendColor = health.score >= 70 ? "text-[var(--success)]" : health.score >= 40 ? "text-[var(--warning)]" : "text-[var(--destructive)]";

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog" aria-modal="true" aria-label={`Repository Health Explorer – ${shortName}`}
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-lg max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl
                      border border-[var(--border)] bg-[var(--card)] shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3
                        border-b border-[var(--border)] bg-[var(--card)] px-4 py-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-widest text-[var(--muted-foreground)]">Repository Health Explorer</p>
            <h2 className="text-sm font-semibold text-[var(--card-foreground)] truncate">{shortName}</h2>
          </div>
          <button onClick={onClose} aria-label="Close explorer"
            className="shrink-0 rounded-lg p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--control)] hover:text-[var(--card-foreground)] transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="px-4 py-4 space-y-5">
          {/* Score summary */}
          <div className="flex items-center gap-4">
            <GradeRing score={health.score} grade={health.grade} />
            <div className="space-y-1">
              <p className="text-[11px] text-[var(--muted-foreground)] uppercase tracking-wide">Overall Score</p>
              <p className="text-2xl font-bold text-[var(--card-foreground)]">
                {health.score}<span className="text-sm font-normal text-[var(--muted-foreground)]"> / 100</span>
              </p>
              <p className={`text-xs font-semibold ${trendColor}`}>{trend}</p>
            </div>
          </div>

          {/* Score distribution bar */}
          <div>
            <p className="mb-1.5 text-[11px] font-medium text-[var(--muted-foreground)] uppercase tracking-wide">Score Distribution</p>
            <div className="flex h-3 w-full overflow-hidden rounded-full gap-px">
              {metrics.map((m) => {
                const pct = (m.score / 100) * 100;
                const bg = (m.score / m.maxScore) >= 0.7 ? "bg-[var(--success)]"
                         : (m.score / m.maxScore) >= 0.4 ? "bg-[var(--warning)]"
                         : "bg-[var(--destructive)]";
                return (
                  <div key={m.key} title={`${m.label}: ${m.score.toFixed(0)}/${m.maxScore}`}
                    className={`${bg} first:rounded-l-full last:rounded-r-full transition-all duration-500`}
                    style={{ width: `${pct}%` }} />
                );
              })}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-[var(--muted-foreground)]">
              {metrics.map((m) => (
                <span key={m.key} className="truncate max-w-[60px] text-center">{m.label.split(" ")[0]}</span>
              ))}
            </div>
          </div>

          {/* Metric cards */}
          <div>
            <p className="mb-2 text-[11px] font-medium text-[var(--muted-foreground)] uppercase tracking-wide">Signal Breakdown</p>
            <div className="space-y-2">{metrics.map((m) => <MetricBar key={m.key} metric={m} />)}</div>
          </div>

          {/* Recommendations */}
          <div>
            <p className="mb-2 text-[11px] font-medium text-[var(--muted-foreground)] uppercase tracking-wide">Recommendations</p>
            <div className="space-y-1.5">{recs.map((rec, i) => <RecBadge key={i} text={rec.text} level={rec.level} />)}</div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default RepoHealthExplorer;
