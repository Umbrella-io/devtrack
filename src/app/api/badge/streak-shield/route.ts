import { NextRequest, NextResponse } from "next/server";
import { generateBadgeSVG } from "../badge-utils";
import {
  checkBadgeRateLimit,
  getBadgeClientIp,
} from "@/lib/badge-rate-limit";
import { dateDiffDays, toDateStr } from "@/lib/dateUtils";

export const dynamic = "force-dynamic";

const GITHUB_API = "https://api.github.com";
const GITHUB_USERNAME_RE = /^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i;

interface StreakData {
  current: number;
  longest: number;
  lastCommitDate: string | null;
  totalActiveDays: number;
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

async function fetchStreak(
  username: string,
  token?: string
): Promise<StreakData> {
  const since = new Date();
  since.setDate(since.getDate() - 90);
  const sinceStr = since.toISOString().slice(0, 10);

  const url = `${GITHUB_API}/search/commits?q=author:${username}+author-date:>=${sinceStr}&per_page=100&sort=author-date&order=desc`;

  const searchRes = await fetchGitHubWithToken(url, token);

  if (!searchRes.ok) {
    const errorBody = await searchRes.text();
    console.error(`GitHub API error fetching streak for ${username}:`, {
      status: searchRes.status,
      url,
      body: errorBody,
    });
    return { current: 0, longest: 0, lastCommitDate: null, totalActiveDays: 0 };
  }

  const data = (await searchRes.json()) as {
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

export async function GET(req: NextRequest) {
  const ip = getBadgeClientIp(req);
  const rateLimit = checkBadgeRateLimit(ip);

  if (!rateLimit.allowed) {
    return new NextResponse("Rate limit exceeded", {
      status: 429,
      headers: {
        "Retry-After": String(
          Math.max(rateLimit.reset - Math.floor(Date.now() / 1000), 1)
        ),
        "X-RateLimit-Limit": "20",
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(rateLimit.reset),
      },
    });
  }

  try {
    const username = req.nextUrl.searchParams.get("user");

    if (!username || !GITHUB_USERNAME_RE.test(username)) {
      return NextResponse.json(
        { error: "Invalid username" },
        { status: 400 }
      );
    }

    const githubToken = process.env.GITHUB_TOKEN;
    const streak = await fetchStreak(username, githubToken);

    const svg = generateBadgeSVG({
      label: "DevTrack",
      value: `🔥 ${streak.current} day streak`,
      color: streak.current > 0 ? "#4c1" : "#e05d44",
      labelColor: "#555",
    });

    return new NextResponse(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml;charset=utf-8",
        "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
        "X-RateLimit-Remaining": String(rateLimit.remaining),
        "X-RateLimit-Reset": String(rateLimit.reset),
      },
    });
  } catch (error) {
    console.error("Error generating streak badge:", error);

    const svg = generateBadgeSVG({
      label: "DevTrack",
      value: "Error",
      color: "#ef4444",
      labelColor: "#555",
    });

    return new NextResponse(svg, {
      status: 500,
      headers: {
        "Content-Type": "image/svg+xml;charset=utf-8",
        "Cache-Control": "max-age=60, public",
      },
    });
  }
}
