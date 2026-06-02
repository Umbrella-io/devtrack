import { calculateStreakFromDates } from "@/lib/streak";
import type { GitHubAchievement } from "@/lib/github-achievements";

const GITHUB_API = "https://api.github.com";

export interface TopRepo {
  name: string;
  commits: number;
  url: string;
}

export interface ContributionData {
  days: number;
  total: number;
  data: Record<string, number>;
}

export interface StreakData {
  current: number;
  longest: number;
  lastCommitDate: string | null;
  totalActiveDays: number;
}

export interface PublicProfileData {
  username: string;
  userId: string;
  repos: TopRepo[];
  contributions: ContributionData;
  streak: StreakData;
  achievements: GitHubAchievement[];
  achievementsError?: string | null;
}

async function ghFetch(url: string, token?: string): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(url, { headers, cache: "no-store" });
}

export async function fetchPublicTopRepos(
  username: string,
  token?: string,
  days = 30
): Promise<TopRepo[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);

  const res = await ghFetch(
    `${GITHUB_API}/search/commits?q=author:${username}+author-date:>=${sinceStr}&per_page=100&sort=author-date&order=desc`,
    token
  );

  if (!res.ok) return [];

  const data = (await res.json()) as {
    items: Array<{ repository: { full_name: string; html_url: string } }>;
  };

  const repoMap: Record<string, { commits: number; url: string }> = {};
  for (const item of data.items) {
    const name = item.repository.full_name;
    if (!repoMap[name]) repoMap[name] = { commits: 0, url: item.repository.html_url };
    repoMap[name].commits++;
  }

  return Object.entries(repoMap)
    .map(([name, info]) => ({ name, ...info }))
    .sort((a, b) => b.commits - a.commits)
    .slice(0, 6);
}

export async function fetchPublicContributions(
  username: string,
  token?: string,
  days = 30
): Promise<ContributionData> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);

  const res = await ghFetch(
    `${GITHUB_API}/search/commits?q=author:${username}+author-date:>=${sinceStr}&per_page=100&sort=author-date&order=desc`,
    token
  );

  if (!res.ok) return { days, total: 0, data: {} };

  const data = (await res.json()) as {
    total_count: number;
    items: Array<{ commit: { author: { date: string } } }>;
  };

  const commitsByDay: Record<string, number> = {};
  for (const item of data.items) {
    const date = item.commit.author.date.slice(0, 10);
    commitsByDay[date] = (commitsByDay[date] ?? 0) + 1;
  }

  return { days, total: data.total_count, data: commitsByDay };
}

export async function fetchPublicStreak(
  username: string,
  token?: string
): Promise<StreakData> {
  const since = new Date();
  since.setDate(since.getDate() - 90);
  const sinceStr = since.toISOString().slice(0, 10);

  const res = await ghFetch(
    `${GITHUB_API}/search/commits?q=author:${username}+author-date:>=${sinceStr}&per_page=100&sort=author-date&order=desc`,
    token
  );

  if (!res.ok) return { current: 0, longest: 0, lastCommitDate: null, totalActiveDays: 0 };

  const data = (await res.json()) as {
    items: Array<{ commit: { author: { date: string } } }>;
  };

  const activeDates = new Set<string>();
  for (const item of data.items) {
    activeDates.add(item.commit.author.date.slice(0, 10));
  }

  const result = calculateStreakFromDates(activeDates);
  return {
    current: result.current,
    longest: result.longest,
    lastCommitDate: result.lastCommitDate,
    totalActiveDays: result.totalActiveDays,
  };
}

/**
 * Calculates the top language by sampling the user's 30 most recently updated
 * repositories and counting which primary language appears most frequently.
 */
export async function fetchTopLanguage(
  username: string,
  token?: string
): Promise<string | null> {
  const res = await ghFetch(
    `${GITHUB_API}/users/${username}/repos?sort=updated&per_page=30`,
    token
  );
  
  if (!res.ok) return null;
  
  const repos = (await res.json()) as Array<{ language: string | null }>;
  
  const counts: Record<string, number> = {};
  for (const r of repos) {
    if (r.language) {
      counts[r.language] = (counts[r.language] || 0) + 1;
    }
  }
  
  let topLang: string | null = null;
  let maxCount = 0;
  for (const [lang, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      topLang = lang;
    }
  }
  
  return topLang;
}
