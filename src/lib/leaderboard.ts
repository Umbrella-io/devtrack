import { supabaseAdmin } from "@/lib/supabase";
import { dateDiffDays, toDateStr } from "@/lib/dateUtils";
import { cacheGet, cacheSet, cacheDelete, invalidateLeaderboardCache } from "@/lib/metrics-cache";
import {
  pruneExpiredLeaderboardCache,
  type LeaderboardCacheEntry,
} from "@/lib/leaderboard-cache";
import { unstable_cache, revalidateTag } from "next/cache";

export const CACHE_REFRESH_SECONDS = 3600; // 1 hour
export const CACHE_STALE_SECONDS = 6 * 60 * 60; // 6 hours
export const LEADERBOARD_CACHE_KEY = "leaderboard:v1";
export const LEADERBOARD_BUILD_LOCK_KEY = "leaderboard:build-lock:v1";

const GITHUB_API = "https://api.github.com";

export type LeaderboardMetric = "streak" | "commits" | "prs";
export type LeaderboardPeriod = "week" | "month" | "all";

export interface LeaderboardFilters {
  period?: LeaderboardPeriod;
}

export interface PublicUser {
  id: string;
  github_login: string;
  is_sponsor: boolean;
}

export interface LeaderboardEntry {
  id: string;
  rank: number;
  username: string;
  avatarUrl: string;
  profileUrl: string;
  streak: number;
  commits: number;
  prs: number;
  score: number;
  isSponsor: boolean;
}

export interface LeaderboardPayload {
  generatedAt: string;
  refreshSeconds: number;
  leaders: Record<LeaderboardMetric, LeaderboardEntry[]>;
}

function validateUserConcurrency(value: string | undefined): number {
  const DEFAULT = 5;
  const MIN = 1;
  const MAX = 100;

  if (!value) return DEFAULT;

  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    console.warn(
      `[Leaderboard] Invalid LEADERBOARD_USER_CONCURRENCY: "${value}". Using ${DEFAULT}`
    );
    return DEFAULT;
  }

  if (n < MIN || n > MAX) {
    const clamped = Math.max(MIN, Math.min(MAX, n));
    console.warn(
      `[Leaderboard] LEADERBOARD_USER_CONCURRENCY ${n} outside [${MIN}, ${MAX}], clamping to ${clamped}`
    );
    return clamped;
  }

  if (n !== DEFAULT) {
    console.info(`[Leaderboard] Using custom concurrency: ${n}`);
  }
  return n;
}

const USER_CONCURRENCY = validateUserConcurrency(
  process.env.LEADERBOARD_USER_CONCURRENCY
);

const DEFAULT_PERIOD: LeaderboardPeriod = "month";

// Module-level in-memory cache shared between the server component and API route
// within the same Node.js process (standalone mode).
let _memoryCache = new Map<string, LeaderboardCacheEntry<LeaderboardPayload>>();

export function isFresh(payload: LeaderboardPayload): boolean {
  const ts = Date.parse(payload.generatedAt);
  return Number.isFinite(ts) && Date.now() - ts < CACHE_REFRESH_SECONDS * 1000;
}

export function getLeaderboardCacheKey(period: LeaderboardPeriod = DEFAULT_PERIOD): string {
  return `${LEADERBOARD_CACHE_KEY}:${period}`;
}

export function getMemoryCachedLeaderboard(
  period: LeaderboardPeriod = DEFAULT_PERIOD
): LeaderboardPayload | null {
  const cacheKey = getLeaderboardCacheKey(period);
  const cached = pruneExpiredLeaderboardCache(_memoryCache.get(cacheKey));

  if (cached && isFresh(cached.payload)) {
    return cached.payload;
  }

  if (!cached) {
    _memoryCache.delete(cacheKey);
  }

  return null;
}

export function setMemoryCachedLeaderboard(
  payload: LeaderboardPayload,
  period: LeaderboardPeriod = DEFAULT_PERIOD
): void {
  const cacheKey = getLeaderboardCacheKey(period);
  _memoryCache.set(cacheKey, {
    payload,
    expiresAt: Date.now() + CACHE_REFRESH_SECONDS * 1000,
  });
}

/**
 * Evicts every layer of the leaderboard cache so the next request
 * fetches fresh eligibility data from the database.
 *
 * Must be called whenever a user changes settings that affect leaderboard
 * eligibility (is_public or leaderboard_opt_in) so that the updated
 * preference is reflected immediately rather than waiting up to one hour
 * for the cache to expire naturally.
 */
export async function clearLeaderboardCache(): Promise<void> {
  // 1. Drop the module-level in-process cache.
  _memoryCache.clear();

  // 2. Drop all leaderboard shared keys in metrics memory map and Redis/Upstash.
  await invalidateLeaderboardCache();

  // 3. Invalidate Next.js unstable_cache
  revalidateTag("leaderboard", {});
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const safe =
    Number.isFinite(concurrency) && concurrency > 0
      ? Math.floor(concurrency)
      : 1;
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await mapper(items[i], i);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(safe, items.length) }, worker)
  );
  return results;
}

async function fetchGitHubJson<T>(path: string): Promise<T | null> {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(`${GITHUB_API}${path}`, {
      headers,
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      console.error("[Leaderboard] GitHub request failed:", path, res.status);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error("[Leaderboard] GitHub fetch error:", path, err);
    return null;
  }
}

function calculateCurrentStreak(commitDates: string[]): number {
  const days = Array.from(
    new Set(commitDates.map((d) => d.slice(0, 10)))
  ).sort();
  if (days.length === 0) return 0;

  let runLength = 1;
  const runs: { end: string; length: number }[] = [];
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

function getPeriodSince(period: LeaderboardPeriod): string | undefined {
  if (period === "all") {
    return undefined;
  }

  const days = period === "week" ? 7 : 30;
  return toDateStr(new Date(Date.now() - days * 86400000));
}

async function fetchCommitStats(username: string, since?: string) {
  const query = new URLSearchParams({
    q: [
      `author:${username}`,
      since ? `author-date:>=${since}` : "",
    ]
      .filter(Boolean)
      .join(" "),
    per_page: "100",
    sort: "author-date",
    order: "desc",
  });
  return fetchGitHubJson<{
    total_count: number;
    items: Array<{ commit: { author: { date: string } } }>;
  }>(`/search/commits?${query}`);
}

async function fetchPrCount(username: string, since?: string): Promise<number> {
  const query = new URLSearchParams({
    q: [
      `author:${username}`,
      "type:pr",
      since ? `created:>=${since}` : "",
    ]
      .filter(Boolean)
      .join(" "),
    per_page: "1",
  });
  const data = await fetchGitHubJson<{ total_count: number }>(
    `/search/issues?${query}`
  );
  return data?.total_count ?? 0;
}

export async function buildLeaderboard(
  filters: LeaderboardFilters = {}
): Promise<LeaderboardPayload> {
  const period = filters.period ?? DEFAULT_PERIOD;
  const periodStart = getPeriodSince(period);
  const { data: users, error } = await supabaseAdmin
    .from("users")
    .select("id, github_login, is_sponsor")
    .eq("is_public", true)
    .eq("leaderboard_opt_in", true)
    .limit(50);

  if (error) {
    console.error("[Leaderboard] Supabase error:", error);
    throw new Error("Failed to load leaderboard users");
  }

  const now = new Date();
  const streakStart = toDateStr(
    new Date(Date.now() - 365 * 86400000)
  );
  const safeUsers = (users ?? []) as PublicUser[];

  const rows = await mapWithConcurrency(
    safeUsers,
    USER_CONCURRENCY,
    async (user) => {
      const [monthlyCommits, streakCommits, prs] = await Promise.all([
        fetchCommitStats(user.github_login, periodStart),
        fetchCommitStats(user.github_login, streakStart),
        fetchPrCount(user.github_login, periodStart),
      ]);

      const streak = calculateCurrentStreak(
        streakCommits?.items.map((item) => item.commit.author.date) ?? []
      );
      const commits = monthlyCommits?.total_count ?? 0;
      const score = streak * 5 + commits + prs * 3;

      return {
        id: user.id,
        rank: 0,
        username: user.github_login,
        avatarUrl: `https://github.com/${user.github_login}.png?size=96`,
        profileUrl: `/u/${user.github_login}`,
        streak,
        commits,
        prs,
        score,
        isSponsor: user.is_sponsor ?? false,
      };
    }
  );

  const rankBy = (metric: LeaderboardMetric) =>
    [...rows]
      .sort((a, b) => b[metric] - a[metric] || b.score - a.score)
      .slice(0, 50)
      .map((entry, i) => ({ ...entry, rank: i + 1 }));

  return {
    generatedAt: now.toISOString(),
    refreshSeconds: CACHE_REFRESH_SECONDS,
    leaders: {
      streak: rankBy("streak"),
      commits: rankBy("commits"),
      prs: rankBy("prs"),
    },
  };
}

export async function refreshLeaderboardCache(
  filters: LeaderboardFilters = {}
): Promise<LeaderboardPayload> {
  const payload = await buildLeaderboard(filters);
  const period = filters.period ?? DEFAULT_PERIOD;
  const cacheKey = getLeaderboardCacheKey(period);
  await cacheSet(cacheKey, payload, CACHE_STALE_SECONDS);
  setMemoryCachedLeaderboard(payload, period);
  revalidateTag("leaderboard", {});
  return payload;
}

export const getCachedLeaderboard = (filters: LeaderboardFilters = {}) => {
  const period = filters.period ?? DEFAULT_PERIOD;
  return unstable_cache(
    async () => buildLeaderboard(filters),
    ["leaderboard", period],
    { revalidate: CACHE_REFRESH_SECONDS }
  )();
};

export async function getLeaderboardData(
  bypass = false,
  filters: LeaderboardFilters = {}
): Promise<LeaderboardPayload | null> {
  const period = filters.period ?? DEFAULT_PERIOD;
  
  if (bypass) {
    try {
      const payload = await buildLeaderboard(filters);
      const cacheKey = getLeaderboardCacheKey(period);
      await cacheSet(cacheKey, payload, CACHE_STALE_SECONDS);
      setMemoryCachedLeaderboard(payload, period);
      return payload;
    } catch (err) {
      console.error("[Leaderboard] Build failed:", err);
      return null;
    }
  }

  try {
    return await getCachedLeaderboard(filters);
  } catch (err) {
    console.error("[Leaderboard] unstable_cache failed, falling back to custom cache:", err);

    const mem = getMemoryCachedLeaderboard(period);
    if (mem) return mem;

    const cached = await cacheGet<LeaderboardPayload>(getLeaderboardCacheKey(period));
    if (cached && isFresh(cached)) {
      setMemoryCachedLeaderboard(cached, period);
      return cached;
    }

    try {
      const payload = await buildLeaderboard(filters);
      const cacheKey = getLeaderboardCacheKey(period);
      await cacheSet(cacheKey, payload, CACHE_STALE_SECONDS);
      setMemoryCachedLeaderboard(payload, period);
      return payload;
    } catch (buildErr) {
      console.error("[Leaderboard] Fallback build failed:", buildErr);
      const stale = await cacheGet<LeaderboardPayload>(getLeaderboardCacheKey(period));
      return stale ?? null;
    }
  }
}
