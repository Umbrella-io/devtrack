export interface LanguageSlice {
  name: string;
  bytes: number;
  percentage: number;
  color: string;
}

export interface ExplorerRepoCardData {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  htmlUrl: string;
  primaryLanguage: string | null;
  createdAt: string;
  updatedAt: string;
  commitCount: number;
  activity7d: Array<{ day: string; commits: number }>;
  languageBreakdown: LanguageSlice[];
}

export interface RepoOverview {
  fullName: string;
  description: string | null;
  stars: number;
  forks: number;
  openIssues: number;
  watchers: number;
  license: string;
  createdAt: string;
  updatedAt: string;
  defaultBranch: string;
}

export interface ContributorMetric {
  login: string;
  avatarUrl: string;
  commits: number;
  percentage: number;
}

export interface TimelinePoint {
  date: string;
  commits: number;
  prs: number;
  issues: number;
}

export interface HeatmapPoint {
  date: string;
  count: number;
}

export interface RepoHealth {
  activityLevel: "Low" | "Medium" | "High";
  consistency: number;
  mergeEfficiency: number;
  maintenanceScore: number;
}

export interface RepoAnalyticsResponse {
  overview: RepoOverview;
  contributors: ContributorMetric[];
  timeline: TimelinePoint[];
  heatmap: HeatmapPoint[];
  health: RepoHealth;
  languageBreakdown: LanguageSlice[];
  primaryStack: string[];
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}
