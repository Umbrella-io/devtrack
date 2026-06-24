import { dateDiffDays, toDateStr } from "@/lib/dateUtils";
import { cacheGet, cacheSet } from "@/lib/metrics-cache";

// ─────────────────────────────────────────────────────────────────────────────
// Constants & exports
// ─────────────────────────────────────────────────────────────────────────────

export const ORG_ANALYTICS_CACHE_TTL = 60 * 60; // 1 hour
export const ORG_ANALYTICS_CACHE_PREFIX = "org-analytics:v1";
export const ORG_MAX_MEMBERS = 30;
const ORG_MEMBER_CONCURRENCY = 3;
const GITHUB_API = "https://api.github.com";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface OrgMemberStats {
  rank: number;
  username: string;
  avatarUrl: string;
  commits: number;
  streak: number;
  mergedPRs: number;
}

export interface OrgAnalyticsPayload {
  organization: string;
  generatedAt: string;
  totalCommits: number;
  activeContributors: number;
  totalMergedPRs: number;
  topStreaks: OrgMemberStats[];
  topCommitters: OrgMemberStats[];
  topPRContributors: OrgMemberStats[];
  members: OrgMemberStats[];
  pagination: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GitHub rate-limit error
// ─────────────────────────────────────────────────────────────────────────────

export class GitHubRateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super("GitHub rate limit reached");
    this.name = "GitHubRateLimitError";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cache key helper
// ─────────────────────────────────────────────────────────────────────────────

export function orgAnalyticsCacheKey(orgName: string): string {
  return `${ORG_ANALYTICS_CACHE_PREFIX}:${orgName.toLowerCase()}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// GitHub API helper
// ─────────────────────────────────────────────────────────────────────────────

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
      const retryAfter =
        res.headers.get("Retry-After") ??
        res.headers.get("X-RateLimit-Reset");
      console.warn("[OrgAnalytics] GitHub rate limit hit:", path, retryAfter);
      throw new GitHubRateLimitError(retryAfter ? Number(retryAfter) : 60);
    }

    if (!res.ok) {
      if (res.status === 404 || res.status === 422) return null;
      console.error("[OrgAnalytics] GitHub request failed:", path, res.status);
      return null;
    }

    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof GitHubRateLimitError) throw err;
    console.error("[OrgAnalytics] GitHub fetch error:", path, err);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Concurrency helper (same algorithm as follower-leaderboard)
// ─────────────────────────────────────────────────────────────────────────────

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

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker)
  );
  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// Local streak helper (same algorithm as follower-leaderboard calculateCurrentStreak)
// ─────────────────────────────────────────────────────────────────────────────

function computeStreak(dates: string[]): number {
  const days = Array.from(new Set(dates.map((d) => d.slice(0, 10)))).sort();
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

// ─────────────────────────────────────────────────────────────────────────────
// Ranking helper
// ─────────────────────────────────────────────────────────────────────────────

function rankTop5By(
  members: Omit<OrgMemberStats, "rank">[],
  primary: keyof Omit<OrgMemberStats, "rank" | "username" | "avatarUrl">,
  secondary: keyof Omit<OrgMemberStats, "rank" | "username" | "avatarUrl">
): OrgMemberStats[] {
  return [...members]
    .sort((a, b) => {
      const diff = b[primary] - a[primary];
      if (diff !== 0) return diff;
      const secDiff = b[secondary] - a[secondary];
      if (secDiff !== 0) return secDiff;
      return a.username.localeCompare(b.username);
    })
    .slice(0, 5)
    .map((entry, i) => ({ ...entry, rank: i + 1 }));
}

// ─────────────────────────────────────────────────────────────────────────────
// GitHub data fetchers
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchOrgMembers(orgName: string): Promise<string[]> {
  const data = await fetchGitHubJson<Array<{ login?: string }>>(
    `/orgs/${encodeURIComponent(orgName)}/members?per_page=30&type=public`
  );
  if (!data) return [];
  return data
    .slice(0, ORG_MAX_MEMBERS)
    .map((m) => m.login ?? "")
    .filter(Boolean);
}

async function fetchCommitCount(username: string, since: string): Promise<number> {
  const q = `author:${username} author-date:>=${since}`;
  const params = new URLSearchParams({ q, per_page: "1" });
  const data = await fetchGitHubJson<{ total_count: number }>(
    `/search/commits?${params}`
  );
  return data?.total_count ?? 0;
}

async function fetchMergedPRCount(username: string, since: string): Promise<number> {
  const q = `author:${username} type:pr is:merged merged:>=${since}`;
  const params = new URLSearchParams({ q, per_page: "1" });
  const data = await fetchGitHubJson<{ total_count: number }>(
    `/search/issues?${params}`
  );
  return data?.total_count ?? 0;
}

async function fetchMemberStreak(username: string): Promise<number> {
  const data = await fetchGitHubJson<Array<{ type: string; created_at: string }>>(
    `/users/${encodeURIComponent(username)}/events/public?per_page=100`
  );
  if (!data) return 0;
  const pushDates = data
    .filter((e) => e.type === "PushEvent")
    .map((e) => e.created_at.slice(0, 10));
  return computeStreak(pushDates);
}

export async function fetchMemberStats(
  username: string,
  since: string
): Promise<Omit<OrgMemberStats, "rank">> {
  const [commits, mergedPRs, streak] = await Promise.all([
    fetchCommitCount(username, since).catch((err: unknown) => { if (err instanceof GitHubRateLimitError) throw err; return 0; }),
    fetchMergedPRCount(username, since).catch((err: unknown) => { if (err instanceof GitHubRateLimitError) throw err; return 0; }),
    fetchMemberStreak(username).catch((err: unknown) => { if (err instanceof GitHubRateLimitError) throw err; return 0; }),
  ]);

  return {
    username,
    avatarUrl: `https://github.com/${username}.png?size=96`,
    commits,
    streak,
    mergedPRs,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Core builder
// ─────────────────────────────────────────────────────────────────────────────

export async function buildOrgAnalytics(
  orgName: string,
  page = 1,
  perPage = 10
): Promise<OrgAnalyticsPayload> {
  const members = await fetchOrgMembers(orgName);

  const emptyPagination = {
    total: 0,
    page,
    perPage,
    totalPages: 0,
  };

  if (members.length === 0) {
    return {
      organization: orgName,
      generatedAt: new Date().toISOString(),
      totalCommits: 0,
      activeContributors: 0,
      totalMergedPRs: 0,
      topStreaks: [],
      topCommitters: [],
      topPRContributors: [],
      members: [],
      pagination: emptyPagination,
    };
  }

  // 30-day window
  const since = toDateStr(new Date(Date.now() - 30 * 86400000));

  const rawStats = await mapWithConcurrency(
    members,
    ORG_MEMBER_CONCURRENCY,
    (username) => fetchMemberStats(username, since)
  );

  const totalCommits = rawStats.reduce((sum, m) => sum + m.commits, 0);
  const totalMergedPRs = rawStats.reduce((sum, m) => sum + m.mergedPRs, 0);
  const activeContributors = rawStats.filter((m) => m.commits >= 1).length;

  const topStreaks = rankTop5By(rawStats, "streak", "commits");
  const topCommitters = rankTop5By(rawStats, "commits", "streak");
  const topPRContributors = rankTop5By(rawStats, "mergedPRs", "commits");

  // All members sorted by commits desc, then streak desc, then username asc
  const allMembersSorted: OrgMemberStats[] = [...rawStats]
    .sort((a, b) => {
      const diff = b.commits - a.commits;
      if (diff !== 0) return diff;
      const streakDiff = b.streak - a.streak;
      if (streakDiff !== 0) return streakDiff;
      return a.username.localeCompare(b.username);
    })
    .map((entry, i) => ({ ...entry, rank: i + 1 }));

  const total = allMembersSorted.length;
  const totalPages = Math.ceil(total / perPage);
  const safePage = Math.max(1, page ?? 1);
  const startIdx = (safePage - 1) * perPage;
  const pagedMembers = allMembersSorted.slice(startIdx, startIdx + perPage);

  return {
    organization: orgName,
    generatedAt: new Date().toISOString(),
    totalCommits,
    activeContributors,
    totalMergedPRs,
    topStreaks,
    topCommitters,
    topPRContributors,
    members: pagedMembers,
    pagination: {
      total,
      page: safePage,
      perPage,
      totalPages,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Cache storage shape (stores all members, pagination re-applied in-process)
// ─────────────────────────────────────────────────────────────────────────────

interface StoredOrgAnalyticsPayload
  extends Omit<OrgAnalyticsPayload, "members" | "pagination"> {
  allMembers: OrgMemberStats[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Cache-aware entry point
// ─────────────────────────────────────────────────────────────────────────────

export async function getOrgAnalytics(
  orgName: string,
  page = 1,
  perPage = 10,
  bypassCache = false
): Promise<OrgAnalyticsPayload | null> {
  const cacheKey = orgAnalyticsCacheKey(orgName);

  try {
    if (!bypassCache) {
      const cached = await cacheGet<StoredOrgAnalyticsPayload>(
        cacheKey,
        ORG_ANALYTICS_CACHE_TTL
      );

      if (cached) {
        const total = cached.allMembers.length;
        const totalPages = Math.ceil(total / perPage);
        const safePage = Math.max(1, page ?? 1);
        const startIdx = (safePage - 1) * perPage;
        const pagedMembers = cached.allMembers.slice(startIdx, startIdx + perPage);

        return {
          organization: cached.organization,
          generatedAt: cached.generatedAt,
          totalCommits: cached.totalCommits,
          activeContributors: cached.activeContributors,
          totalMergedPRs: cached.totalMergedPRs,
          topStreaks: cached.topStreaks,
          topCommitters: cached.topCommitters,
          topPRContributors: cached.topPRContributors,
          members: pagedMembers,
          pagination: { total, page: safePage, perPage, totalPages },
        };
      }
    }

    // Build full payload (all members) for caching
    const fullPayload = await buildOrgAnalytics(orgName, 1, ORG_MAX_MEMBERS);

    const toStore: StoredOrgAnalyticsPayload = {
      organization: fullPayload.organization,
      generatedAt: fullPayload.generatedAt,
      totalCommits: fullPayload.totalCommits,
      activeContributors: fullPayload.activeContributors,
      totalMergedPRs: fullPayload.totalMergedPRs,
      topStreaks: fullPayload.topStreaks,
      topCommitters: fullPayload.topCommitters,
      topPRContributors: fullPayload.topPRContributors,
      // buildOrgAnalytics with perPage=ORG_MAX_MEMBERS returns all members in page 1
      allMembers: fullPayload.members,
    };

    await cacheSet(cacheKey, toStore, ORG_ANALYTICS_CACHE_TTL);

    // Return the requested page from the full set
    const total = toStore.allMembers.length;
    const totalPages = Math.ceil(total / perPage);
    const safePage = Math.max(1, page ?? 1);
    const startIdx = (safePage - 1) * perPage;
    const pagedMembers = toStore.allMembers.slice(startIdx, startIdx + perPage);

    return {
      organization: toStore.organization,
      generatedAt: toStore.generatedAt,
      totalCommits: toStore.totalCommits,
      activeContributors: toStore.activeContributors,
      totalMergedPRs: toStore.totalMergedPRs,
      topStreaks: toStore.topStreaks,
      topCommitters: toStore.topCommitters,
      topPRContributors: toStore.topPRContributors,
      members: pagedMembers,
      pagination: { total, page: safePage, perPage, totalPages },
    };
  } catch (err) {
    if (err instanceof GitHubRateLimitError) {
      console.warn(
        "[OrgAnalytics] Rate limit hit for org:",
        orgName,
        "retry after",
        err.retryAfterSeconds,
        "s"
      );
      return null;
    }
    console.error("[OrgAnalytics] Unexpected error for org:", orgName, err);
    return null;
  }
}
