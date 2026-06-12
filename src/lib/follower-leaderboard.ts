import { dateDiffDays, toDateStr } from "@/lib/dateUtils";
import { cacheGet, cacheSet } from "@/lib/metrics-cache";

export type FollowerSortMetric = "streak" | "commits" | "prs";

export interface FollowerEntry {
  rank: number;
  username: string;
  avatarUrl: string;
  profileUrl: string;
  streak: number;
  commitsThisMonth: number;
  mergedPullRequests: number;
}

export interface FollowerLeaderboardPayload {
  generatedAt: string;
  metric: FollowerSortMetric;
  entries: FollowerEntry[];
}

/**
 * Cache TTL: 5 minutes — follower stats change frequently enough to
 * warrant short-lived caching while still protecting GitHub rate limits.
 * Key format: leaderboard:followers:v1:{githubLogin}
 */
export const FOLLOWER_LEADERBOARD_TTL_SECONDS = 5 * 60;
export const FOLLOWER_LEADERBOARD_CACHE_PREFIX = "leaderboard:followers:v1";
export const FOLLOWER_MAX_COUNT = 20;
const FOLLOWER_USER_CONCURRENCY = 5;
const GITHUB_API = "https://api.github.com";

export function followerCacheKey(githubLogin: string): string {
  return `${FOLLOWER_LEADERBOARD_CACHE_PREFIX}:${githubLogin}`;
}

async function fetchGitHubJson<T>(path: string): Promise<T | null> {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(`${GITHUB_API}${path}`, {
      headers,
      next: { revalidate: 300 },
    });

    if (res.status === 403 || res.status === 429) {
      const retryAfter = res.headers.get("Retry-After") ?? res.headers.get("X-RateLimit-Reset");
      console.warn("[FollowerLeaderboard] GitHub rate limit hit:", path, retryAfter);
      throw new GitHubRateLimitError(retryAfter ? Number(retryAfter) : 60);
    }

    if (!res.ok) {
      if (res.status === 404 || res.status === 422) return null;
      console.error("[FollowerLeaderboard] GitHub request failed:", path, res.status);
      return null;
    }

    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof GitHubRateLimitError) throw err;
    console.error("[FollowerLeaderboard] GitHub fetch error:", path, err);
    return null;
  }
}

export class GitHubRateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super("GitHub rate limit reached");
    this.name = "GitHubRateLimitError";
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await mapper(items[i]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

/** Returns YYYY-MM-01 for the current calendar month. */
function getMonthStart(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

/**
 * Fetches up to FOLLOWER_MAX_COUNT followers for a given GitHub user.
 * Returns a list of follower logins.
 */
export async function fetchFollowers(githubLogin: string): Promise<string[]> {
  const data = await fetchGitHubJson<Array<{ login: string }>>(
    `/users/${encodeURIComponent(githubLogin)}/followers?per_page=${FOLLOWER_MAX_COUNT}`
  );
  if (!data) return [];
  return data.slice(0, FOLLOWER_MAX_COUNT).map((f) => f.login);
}

/**
 * Counts commits authored by a user in the current calendar month using
 * the GitHub Search API (public commits only).
 */
export async function fetchCommitsThisMonth(username: string): Promise<number> {
  const since = getMonthStart();
  const q = `author:${username} author-date:>=${since}`;
  const params = new URLSearchParams({ q, per_page: "1" });
  const data = await fetchGitHubJson<{ total_count: number }>(
    `/search/commits?${params}`
  );
  return data?.total_count ?? 0;
}

/**
 * Counts pull requests merged by a user in the current calendar month using
 * the GitHub Search API (public PRs only).
 */
export async function fetchMergedPRsThisMonth(username: string): Promise<number> {
  const since = getMonthStart();
  const q = `author:${username} type:pr is:merged merged:>=${since}`;
  const params = new URLSearchParams({ q, per_page: "1" });
  const data = await fetchGitHubJson<{ total_count: number }>(
    `/search/issues?${params}`
  );
  return data?.total_count ?? 0;
}

/**
 * Computes the current commit streak for a user from public events.
 * Streak = number of consecutive calendar days (ending today or yesterday)
 * that contain at least one PushEvent.
 */
export async function fetchCurrentStreak(username: string): Promise<number> {
  const data = await fetchGitHubJson<Array<{ type: string; created_at: string }>>(
    `/users/${encodeURIComponent(username)}/events/public?per_page=100`
  );
  if (!data) return 0;

  const pushDates = data
    .filter((e) => e.type === "PushEvent")
    .map((e) => e.created_at.slice(0, 10));

  return calculateCurrentStreak(pushDates);
}

/**
 * Pure-function streak calculation. Exported for testing.
 * Given a list of date strings (YYYY-MM-DD, may contain duplicates),
 * returns the length of the longest consecutive-day run ending on today or yesterday.
 */
export function calculateCurrentStreak(commitDates: string[]): number {
  const days = Array.from(new Set(commitDates.map((d) => d.slice(0, 10)))).sort();
  if (days.length === 0) return 0;

  let runLength = 1;
  const runs: Array<{ end: string; length: number }> = [];

  for (let i = 1; i < days.length; i++) {
    if (dateDiffDays(days[i - 1], days[i]) === 1) {
      runLength++;
    } else {
      runs.push({ end: days[i - 1], length: runLength });
      runLength = 1;
    }
  }
  runs.push({ end: days[days.length - 1], length: runLength });

  const today = toDateStr(new Date());
  const yesterday = toDateStr(new Date(Date.now() - 86400000));
  const latest = runs[runs.length - 1];
  return latest.end === today || latest.end === yesterday ? latest.length : 0;
}

/**
 * Sorts and ranks follower entries by the chosen metric.
 * Tie-breaking order: selected metric → commits → username (alphabetical).
 */
export function sortAndRank(
  entries: Omit<FollowerEntry, "rank">[],
  metric: FollowerSortMetric
): FollowerEntry[] {
  const primary = (e: Omit<FollowerEntry, "rank">) =>
    metric === "streak"
      ? e.streak
      : metric === "commits"
      ? e.commitsThisMonth
      : e.mergedPullRequests;

  return [...entries]
    .sort((a, b) => {
      const diff = primary(b) - primary(a);
      if (diff !== 0) return diff;
      const commitDiff = b.commitsThisMonth - a.commitsThisMonth;
      if (commitDiff !== 0) return commitDiff;
      return a.username.localeCompare(b.username);
    })
    .map((entry, i) => ({ ...entry, rank: i + 1 }));
}

/**
 * Builds a follower leaderboard for a given authenticated user.
 * Fetches followers, then concurrently gathers each follower's stats.
 * Throws GitHubRateLimitError if the GitHub API rate limit is hit.
 */
export async function buildFollowerLeaderboard(
  githubLogin: string,
  metric: FollowerSortMetric = "streak"
): Promise<FollowerLeaderboardPayload> {
  const followers = await fetchFollowers(githubLogin);

  const rawEntries = await mapWithConcurrency(
    followers,
    FOLLOWER_USER_CONCURRENCY,
    async (username): Promise<Omit<FollowerEntry, "rank">> => {
      const [streak, commitsThisMonth, mergedPullRequests] = await Promise.all([
        fetchCurrentStreak(username),
        fetchCommitsThisMonth(username),
        fetchMergedPRsThisMonth(username),
      ]);

      return {
        username,
        avatarUrl: `https://github.com/${username}.png?size=96`,
        profileUrl: `https://github.com/${username}`,
        streak,
        commitsThisMonth,
        mergedPullRequests,
      };
    }
  );

  const entries = sortAndRank(rawEntries, metric);

  return {
    generatedAt: new Date().toISOString(),
    metric,
    entries,
  };
}

/**
 * Returns follower leaderboard data, using the shared cache where possible.
 * The cache stores the base (streak-sorted) payload; re-sorting is applied
 * in-process so sort switching does not trigger additional GitHub API calls.
 *
 * Cache key: leaderboard:followers:v1:{githubLogin}
 * TTL: 5 minutes
 */
export async function getFollowerLeaderboard(
  githubLogin: string,
  metric: FollowerSortMetric = "streak",
  bypassCache = false
): Promise<FollowerLeaderboardPayload> {
  const cacheKey = followerCacheKey(githubLogin);

  if (!bypassCache) {
    const cached = await cacheGet<FollowerLeaderboardPayload>(
      cacheKey,
      FOLLOWER_LEADERBOARD_TTL_SECONDS
    );
    if (cached) {
      // Re-sort cached entries for the requested metric without hitting GitHub.
      const resorted = sortAndRank(
        cached.entries.map(({ rank: _rank, ...e }) => e),
        metric
      );
      return { ...cached, metric, entries: resorted };
    }
  }

  const payload = await buildFollowerLeaderboard(githubLogin, metric);
  await cacheSet(cacheKey, payload, FOLLOWER_LEADERBOARD_TTL_SECONDS);
  return payload;
}
