export interface RepoHealthSignals {
  commitFrequency: number; // commits in last 30 days
  prMergeRate: number; // merged PRs / opened PRs (0-1)
  avgPrOpenTimeHours: number; // average hours a PR was open before close
  openIssuesCount: number; // current open issues
  daysSinceLastCommit: number; // recency signal
}

export interface RepoHealthScore {
  repo: string; // "owner/repo"
  score: number; // 0-100 composite
  signals: RepoHealthSignals;
  grade: "green" | "yellow" | "red"; // green 70+, yellow 40-69, red <40
}

export interface RepoHealthResponse {
  repos: RepoHealthScore[];
}

