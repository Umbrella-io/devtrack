export interface WeeklyProductivityPromptParams {
  activeDays: number;
  currentStreak: number;
  totalCommits: number;
  prsMerged: number;
  prsOpen: number;
  avgMergeTimeDays: number;
  topRepoName: string;
  trendLabel: string;
}

export function weeklyProductivityPrompt(params: WeeklyProductivityPromptParams): string {
  return `You are a senior engineering mentor reviewing a developer's GitHub activity from the past week.

Here is their data:
- Active coding days: ${params.activeDays}
- Current streak: ${params.currentStreak} days
- Total commits (90d): ${params.totalCommits}
- PRs merged: ${params.prsMerged}, open: ${params.prsOpen}
- Avg PR merge time: ${params.avgMergeTimeDays.toFixed(1)} days
- Top repository: ${params.topRepoName}
- Activity trend: ${params.trendLabel} vs prior period

Write a warm, concise 3-sentence weekly summary. Start with a highlight, add one observation, end with one actionable tip. Address the developer as "you". No bullet points.`;
}
