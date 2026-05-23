import { NextRequest, NextResponse } from "next/server";
import { getUserByUsername } from "@/lib/supabase";
import { dateDiffDays, toDateStr } from "@/lib/dateUtils";

export const dynamic = "force-dynamic";

const GITHUB_API = "https://api.github.com";

/**
 * In-memory rate limiter for IP addresses.
 * Maps IP -> { count: number, resetAt: number }
 * This resets on server restart. For production, use Redis.
 */
const ipRateLimits = new Map<
  string,
  { count: number; resetAt: number }
>();

const RATE_LIMIT_REQUESTS = 30;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

function getRateLimitKey(req: NextRequest): string {
  // req.ip is populated by the Next.js / Vercel runtime from the verified
  // network-layer source address and cannot be spoofed by the caller.
  //
  // x-forwarded-for is intentionally excluded here: it is a plain request
  // header that any client can set to an arbitrary value. Trusting it as the
  // primary key allows an attacker to rotate the header on every request,
  // bypass the per-IP limit entirely, and exhaust the shared GITHUB_TOKEN
  // quota (5 000 req/hr), making the endpoint unavailable for all users.
  return req.ip || req.headers.get("x-real-ip") || "unknown";
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = ipRateLimits.get(ip);

  if (!record || now > record.resetAt) {
    // New window or expired
    ipRateLimits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  if (record.count < RATE_LIMIT_REQUESTS) {
    record.count++;
    return { allowed: true };
  }

  // Rate limit exceeded
  const retryAfter = Math.ceil((record.resetAt - now) / 1000);
  return { allowed: false, retryAfter };
}

async function fetchGitHubWithToken(
  url: string,
  token?: string
): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return fetch(url, { headers, cache: "no-store" });
}

interface TopRepo {
  name: string;
  commits: number;
  url: string;
}

interface ContributionData {
  days: number;
  total: number;
  data: Record<string, number>;
}

interface StreakData {
  current: number;
  longest: number;
  lastCommitDate: string | null;
  totalActiveDays: number;
}

async function fetchTopRepos(
  username: string,
  token?: string,
  days: number = 30
): Promise<TopRepo[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);

  const searchRes = await fetchGitHubWithToken(
    `${GITHUB_API}/search/commits?q=author:${username}+author-date:>=${sinceStr}&per_page=100&sort=author-date&order=desc`,
    token
  );

  if (!searchRes.ok) {
    console.error("GitHub API error fetching repos:", searchRes.status);
    return [];
  }

  const data = (await searchRes.json()) as {
    items: Array<{
      repository: { full_name: string; html_url: string };
    }>;
  };

  const repoMap: Record<string, { commits: number; url: string }> = {};
  for (const item of data.items) {
    const name = item.repository.full_name;
    if (!repoMap[name]) {
      repoMap[name] = { commits: 0, url: item.repository.html_url };
    }
    repoMap[name].commits++;
  }

  return Object.entries(repoMap)
    .map(([name, info]) => ({ name, ...info }))
    .sort((a, b) => b.commits - a.commits)
    .slice(0, 6);
}

async function fetchContributions(
  username: string,
  token?: string,
  days: number = 30
): Promise<ContributionData> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);

  const searchRes = await fetchGitHubWithToken(
    `${GITHUB_API}/search/commits?q=author:${username}+author-date:>=${sinceStr}&per_page=100&sort=author-date&order=desc`,
    token
  );

  if (!searchRes.ok) {
    console.error("GitHub API error fetching contributions:", searchRes.status);
    return { days, total: 0, data: {} };
  }

  const data = (await searchRes.json()) as {
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

async function fetchStreak(
  username: string,
  token?: string
): Promise<StreakData> {
  const since = new Date();
  since.setDate(since.getDate() - 90);
  const sinceStr = since.toISOString().slice(0, 10);

  const searchRes = await fetchGitHubWithToken(
    `${GITHUB_API}/search/commits?q=author:${username}+author-date:>=${sinceStr}&per_page=100&sort=author-date&order=desc`,
    token
  );

  if (!searchRes.ok) {
    console.error("GitHub API error fetching streak:", searchRes.status);
    return { current: 0, longest: 0, lastCommitDate: null, totalActiveDays: 0 };
  }

  const data = (await searchRes.json()) as {
    items: Array<{ commit: { author: { date: string } } }>;
  };

  // Unique commit days
  const daySet: Record<string, true> = {};
  for (const item of data.items) {
    daySet[item.commit.author.date.slice(0, 10)] = true;
  }
  const commitDays = Object.keys(daySet).sort();

  if (commitDays.length === 0) {
    return { current: 0, longest: 0, lastCommitDate: null, totalActiveDays: 0 };
  }

  // Build streaks
  let longestStreak = 1;
  let currentRun = 1;
  const runs: { start: string; end: string; length: number }[] = [];
  let runStart = commitDays[0];

  for (let i = 1; i < commitDays.length; i++) {
    const diff = dateDiffDays(commitDays[i - 1], commitDays[i]);
    if (diff === 1) {
      currentRun++;
      if (currentRun > longestStreak) longestStreak = currentRun;
    } else {
      runs.push({
        start: runStart,
        end: commitDays[i - 1],
        length: currentRun,
      });
      runStart = commitDays[i];
      currentRun = 1;
    }
  }
  runs.push({
    start: runStart,
    end: commitDays[commitDays.length - 1],
    length: currentRun,
  });

  // Current streak: check if last commit day is today or yesterday
  const lastDay = commitDays[commitDays.length - 1];
  const today = toDateStr(new Date());
  const yesterday = toDateStr(new Date(Date.now() - 86400000));

  const lastRun = runs[runs.length - 1];
  const currentStreak =
    lastRun.end === today || lastRun.end === yesterday ? lastRun.length : 0;

  return {
    current: currentStreak,
    longest: longestStreak,
    lastCommitDate: lastDay,
    totalActiveDays: commitDays.length,
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: { username: string } }
): Promise<NextResponse> {
  const { username } = params;

  // Rate limiting
  const ip = getRateLimitKey(req);
  const rateLimit = checkRateLimit(ip);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfter),
        },
      }
    );
  }

  // Look up user in Supabase
  const user = await getUserByUsername(username);

  if (!user) {
    return NextResponse.json(
      { error: "User not found or profile is not public" },
      { status: 404 }
    );
  }

  // Use GITHUB_TOKEN env var if available for higher rate limits
  const githubToken = process.env.GITHUB_TOKEN;

  // Fetch all metrics in parallel
  const [repos, contributions, streak] = await Promise.all([
    fetchTopRepos(username, githubToken, 30),
    fetchContributions(username, githubToken, 30),
    fetchStreak(username, githubToken),
  ]);

  return NextResponse.json({
    username: user.github_login,
    userId: user.id,
    repos,
    contributions,
    streak,
  });
}
