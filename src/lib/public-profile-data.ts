import { dateDiffDays, toDateStr } from "@/lib/dateUtils";
import type { GitHubAchievement } from "@/lib/github-achievements";
import { syncGitHubAchievementsForUser } from "@/lib/github-achievements";
import { fetchPinnedRepoDetails, type PinnedRepoDetails } from "@/lib/pinned-repos";
import { getUserByUsername } from "@/lib/supabase";

const GITHUB_API = "https://api.github.com";

export interface TopRepo {
  name: string;
  commits: number;
  url: string;
}

export interface PublicLanguage {
  name: string;
  count: number;
  percentage: number;
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
  bio: string | null;
  isSponsor: boolean;
  repos: TopRepo[];
  contributions: ContributionData;
  streak: StreakData;
  topLanguages: PublicLanguage[];
  pullRequests: number;
  achievements: GitHubAchievement[];
  achievementsError?: string | null;
  spotlightRepos?: PinnedRepoDetails[];
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

  const daySet: Record<string, true> = {};
  for (const item of data.items) {
    daySet[item.commit.author.date.slice(0, 10)] = true;
  }
  const commitDays = Object.keys(daySet).sort();

  if (commitDays.length === 0) {
    return { current: 0, longest: 0, lastCommitDate: null, totalActiveDays: 0 };
  }

  let longestStreak = 1;
  let currentRun = 1;
  const runs: { end: string; length: number }[] = [];

  for (let i = 1; i < commitDays.length; i++) {
    const diff = dateDiffDays(commitDays[i - 1], commitDays[i]);
    if (diff === 1) {
      currentRun++;
      if (currentRun > longestStreak) longestStreak = currentRun;
    } else {
      runs.push({ end: commitDays[i - 1], length: currentRun });
      currentRun = 1;
    }
  }
  runs.push({ end: commitDays[commitDays.length - 1], length: currentRun });

  const lastDay = commitDays[commitDays.length - 1];
  const today = toDateStr(new Date());
  const yesterday = toDateStr(new Date(Date.now() - 86400000));
  const lastRun = runs[runs.length - 1];
  const currentStreak = lastRun.end === today || lastRun.end === yesterday ? lastRun.length : 0;

  return {
    current: currentStreak,
    longest: longestStreak,
    lastCommitDate: lastDay,
    totalActiveDays: commitDays.length,
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

export async function fetchPublicTopLanguages(
  username: string,
  token?: string
): Promise<PublicLanguage[]> {
  const res = await ghFetch(
    `${GITHUB_API}/users/${username}/repos?sort=updated&per_page=30`,
    token
  );

  if (!res.ok) return [];

  const repos = (await res.json()) as Array<{ language: string | null }>;
  const counts: Record<string, number> = {};

  for (const repo of repos) {
    if (repo.language) {
      counts[repo.language] = (counts[repo.language] ?? 0) + 1;
    }
  }

  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  if (total === 0) return [];

  return Object.entries(counts)
    .map(([name, count]) => ({
      name,
      count,
      percentage: Math.round((count / total) * 1000) / 10,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

export async function fetchPublicPullRequests(
  username: string,
  token?: string
): Promise<number> {
  const res = await ghFetch(
    `${GITHUB_API}/search/issues?q=type:pr+author:${username}&per_page=1`,
    token
  );

  if (!res.ok) return 0;

  const data = (await res.json()) as { total_count?: number };
  return data.total_count ?? 0;
}

export async function fetchPublicProfile(
  username: string,
  options: { includeAchievements?: boolean } = {}
): Promise<PublicProfileData | null> {
  const user = await getUserByUsername(username);
  if (!user) return null;

  const githubToken = process.env.GITHUB_TOKEN;
  const [
    repos,
    contributions,
    streak,
    topLanguages,
    pullRequests,
    achievementsCache,
    spotlight,
  ] = await Promise.all([
    fetchPublicTopRepos(user.github_login, githubToken, 30),
    fetchPublicContributions(user.github_login, githubToken, 30),
    fetchPublicStreak(user.github_login, githubToken),
    fetchPublicTopLanguages(user.github_login, githubToken),
    fetchPublicPullRequests(user.github_login, githubToken),
    options.includeAchievements
      ? syncGitHubAchievementsForUser({
          userId: user.id,
          githubLogin: user.github_login,
          token: githubToken,
        })
      : Promise.resolve({ achievements: [], syncedAt: null, error: null }),
    fetchPinnedRepoDetails(
      user.github_login,
      user.pinned_repos || [],
      githubToken || ""
    ),
  ]);

  return {
    username: user.github_login,
    userId: user.id,
    bio: user.bio ?? null,
    isSponsor: user.is_sponsor ?? false,
    repos,
    contributions,
    streak,
    topLanguages,
    pullRequests,
    achievements: achievementsCache.achievements,
    achievementsError: achievementsCache.error,
    spotlightRepos: spotlight,
  };
}
