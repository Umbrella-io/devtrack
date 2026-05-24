import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { dateDiffDays, toDateStr } from "@/lib/dateUtils";

export const dynamic = "force-dynamic";

const GITHUB_API = "https://api.github.com";
const CACHE_TTL_MS = 60 * 60 * 1000;
const RATE_LIMIT_REQUESTS = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

type LeaderboardMetric = "streak" | "commits" | "prs";

interface PublicUser {
  id: string;
  github_login: string;
}

interface LeaderboardEntry {
  rank: number;
  username: string;
  avatarUrl: string;
  profileUrl: string;
  streak: number;
  commits: number;
  prs: number;
  score: number;
}

interface LeaderboardPayload {
  generatedAt: string;
  refreshSeconds: number;
  leaders: Record<LeaderboardMetric, LeaderboardEntry[]>;
}

let leaderboardCache: { expiresAt: number; payload: LeaderboardPayload } | null =
  null;

const ipRateLimits = new Map<string, { count: number; resetAt: number }>();

function getRateLimitKey(req: NextRequest): string {
  return (
    req.ip ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  for (const [key, record] of ipRateLimits) {
    if (now > record.resetAt) ipRateLimits.delete(key);
  }
  const record = ipRateLimits.get(ip);

  if (!record || now > record.resetAt) {
    ipRateLimits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  if (record.count < RATE_LIMIT_REQUESTS) {
    record.count += 1;
    return { allowed: true };
  }

  return { allowed: false, retryAfter: Math.ceil((record.resetAt - now) / 1000) };
}

function cleanupCache(): void {
  const now = Date.now();
  if (leaderboardCache && now > leaderboardCache.expiresAt) {
    leaderboardCache = null;
  }
}

async function fetchGitHubJson<T>(path: string): Promise<T | null> {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${GITHUB_API}${path}`, {
    headers,
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    console.error("GitHub leaderboard request failed:", path, res.status);
    return null;
  }

  return (await res.json()) as T;
}

function calculateCurrentStreak(commitDates: string[]): number {
  const days = Array.from(new Set(commitDates.map((date) => date.slice(0, 10)))).sort();
  if (days.length === 0) {
    return 0;
  }

  let runLength = 1;
  const runs: { end: string; length: number }[] = [];
  for (let i = 1; i < days.length; i += 1) {
    if (dateDiffDays(days[i - 1], days[i]) === 1) {
      runLength += 1;
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

async function fetchCommitStats(username: string, since: string) {
  const query = new URLSearchParams({
    q: `author:${username} author-date:>=${since}`,
    per_page: "100",
    sort: "author-date",
    order: "desc",
  });
  return fetchGitHubJson<{
    total_count: number;
    items: Array<{ commit: { author: { date: string } } }>;
  }>(`/search/commits?${query.toString()}`);
}

async function fetchPrCount(username: string, since: string): Promise<number> {
  const query = new URLSearchParams({
    q: `author:${username} type:pr created:>=${since}`,
    per_page: "1",
  });
  const data = await fetchGitHubJson<{ total_count: number }>(
    `/search/issues?${query.toString()}`
  );
  return data?.total_count ?? 0;
}

async function buildLeaderboard(): Promise<LeaderboardPayload> {
  const { data: users, error } = await supabaseAdmin
    .from("users")
    .select("id, github_login")
    .eq("is_public", true)
    .eq("leaderboard_opt_in", true)
    .limit(50);

  if (error) {
    console.error("Failed to fetch leaderboard users:", error);
    throw new Error("Failed to load leaderboard users");
  }

  const now = new Date();
  const monthStart = toDateStr(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));
  const streakStart = toDateStr(new Date(Date.now() - 90 * 86400000));

  const rows = await Promise.all(
    ((users ?? []) as PublicUser[]).map(async (user) => {
      const [monthlyCommits, streakCommits, prs] = await Promise.all([
        fetchCommitStats(user.github_login, monthStart),
        fetchCommitStats(user.github_login, streakStart),
        fetchPrCount(user.github_login, monthStart),
      ]);

      const streak = calculateCurrentStreak(
        streakCommits?.items.map((item) => item.commit.author.date) ?? []
      );
      const commits = monthlyCommits?.total_count ?? 0;
      const score = streak * 5 + commits + prs * 3;

      return {
        rank: 0,
        username: user.github_login,
        avatarUrl: `https://github.com/${user.github_login}.png?size=96`,
        profileUrl: `/u/${user.github_login}`,
        streak,
        commits,
        prs,
        score,
      };
    })
  );

  const rankBy = (metric: LeaderboardMetric) =>
    [...rows]
      .sort((a, b) => b[metric] - a[metric] || b.score - a.score)
      .slice(0, 50)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

  return {
    generatedAt: now.toISOString(),
    refreshSeconds: CACHE_TTL_MS / 1000,
    leaders: {
      streak: rankBy("streak"),
      commits: rankBy("commits"),
      prs: rankBy("prs"),
    },
  };
}

export async function GET(req: NextRequest) {
  cleanupCache();
  const ip = getRateLimitKey(req);
  const rateLimit = checkRateLimit(ip);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } }
    );
  }

  if (leaderboardCache && Date.now() < leaderboardCache.expiresAt) {
    return NextResponse.json(leaderboardCache.payload);
  }

  try {
    const payload = await buildLeaderboard();
    leaderboardCache = { payload, expiresAt: Date.now() + CACHE_TTL_MS };
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json(
      { error: "Failed to build leaderboard" },
      { status: 500 }
    );
  }
}
