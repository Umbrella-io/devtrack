export type RepoVisibility = "public" | "private" | "internal" | "unknown";

export interface InactiveRepo {
  name: string;
  lastActiveAt: string;
  inactiveDays: number;
  visibility: RepoVisibility;
  url: string;
}

export interface InactiveReposResponse {
  repos: InactiveRepo[];
  thresholdDays: number;
}
