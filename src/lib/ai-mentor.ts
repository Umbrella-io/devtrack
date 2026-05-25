export interface DeveloperMetrics {
  commits: { date: string; count: number }[];

  prs: {
    merged: number;
    open: number;
    avgMergeTimeDays: number;
  };

  streak: {
    current: number;
    longest: number;
    activeDays: number;
  };

  repos: { name: string; commits: number }[];
}

export interface Insight {
  id: string;
  type: "productivity" | "habit" | "recommendation" | "milestone";
  title: string;
  description: string;
  severity: "positive" | "neutral" | "warning";
}

export function analyzePatterns(metrics: DeveloperMetrics): Insight[] {
  const insights: Insight[] = [];

  const totalCommits = metrics.commits.reduce((s, d) => s + d.count, 0);
  const avgCommitsPerActiveDay =
    totalCommits / Math.max(metrics.streak.activeDays, 1);

  if (avgCommitsPerActiveDay > 8) {
    insights.push({
      id: "large-commits",
      type: "recommendation",
      title: "Consider smaller, more focused commits",
      description: `You're averaging ${avgCommitsPerActiveDay.toFixed(
        1
      )} commits per active day. Splitting large changesets into atomic commits makes code review easier and history cleaner.`,
      severity: "neutral",
    });
  }

  const last30Days = metrics.commits.slice(-30);
  const activeDaysLast30 = last30Days.filter((d) => d.count > 0).length;

  if (activeDaysLast30 >= 20) {
    insights.push({
      id: "high-consistency",
      type: "milestone",
      title: "Excellent coding consistency",
      description: `You coded on ${activeDaysLast30} of the last 30 days. Consistent practice is one of the strongest predictors of long-term skill growth.`,
      severity: "positive",
    });
  } else if (activeDaysLast30 < 10) {
    insights.push({
      id: "low-consistency",
      type: "habit",
      title: "Coding consistency needs attention",
      description: `Only ${activeDaysLast30} active days in the last month. Even 20–30 minutes daily compounds significantly over time.`,
      severity: "warning",
    });
  }

  if (metrics.repos.length > 0) {
    const topRepo = metrics.repos[0];
    const repoTotal = metrics.repos.reduce((s, r) => s + r.commits, 0);
    const concentration =
      repoTotal > 0 ? (topRepo.commits / repoTotal) * 100 : 0;

    if (concentration > 80) {
      insights.push({
        id: "repo-concentration",
        type: "recommendation",
        title: "Most activity concentrated in one repo",
        description: `${concentration.toFixed(0)}% of your commits are in "${
          topRepo.name
        }". Diversifying across projects or open source can broaden your skill set.`,
        severity: "neutral",
      });
    }
  }

  if (metrics.prs.avgMergeTimeDays > 0 && metrics.prs.avgMergeTimeDays < 2) {
    insights.push({
      id: "fast-prs",
      type: "productivity",
      title: "Fast PR turnaround",
      description:
        "Your PRs are merging in under 2 days on average — a sign of good scoping and clear commit messages.",
      severity: "positive",
    });
  }

  if (metrics.streak.current >= 7) {
    insights.push({
      id: "streak-milestone",
      type: "milestone",
      title: `${metrics.streak.current}-day coding streak 🔥`,
      description: `You've been coding every day for ${metrics.streak.current} days. Keep the momentum — streaks build habits.`,
      severity: "positive",
    });
  }

  return insights;
}

export function computeTrends(metrics: DeveloperMetrics): {
  direction: "up" | "down";
  percentage: number;
} {
  const commits = metrics.commits;
  if (commits.length === 0) return { direction: "up", percentage: 0 };

  const mid = Math.floor(commits.length / 2);
  const firstHalf = commits.slice(0, mid).reduce((s, d) => s + d.count, 0);
  const secondHalf = commits.slice(mid).reduce((s, d) => s + d.count, 0);
  const trendPercent =
    firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;

  return {
    direction: trendPercent >= 0 ? "up" : "down",
    percentage: Math.abs(Math.round(trendPercent)),
  };
}
