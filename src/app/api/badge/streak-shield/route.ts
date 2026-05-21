import { NextRequest, NextResponse } from "next/server";
import { generateBadgeSVG } from "../badge-utils";
import { cacheGet, cacheSet } from "@/lib/metrics-cache";

export const dynamic = "force-dynamic";

const GITHUB_API = "https://api.github.com";
const BADGE_CACHE_TTL = 3600;

// GitHub username: alphanumeric and hyphens, no leading/trailing hyphens,
// no consecutive hyphens, 1–39 characters.
const GITHUB_USERNAME_RE = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;

interface StreakData {
  current: number;
  longest: number;
  lastCommitDate: string | null;
  totalActiveDays: number;
}

function dateDiffDays(a: string, b: string): number {
  return (
    (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24)
  );
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function fetchStreak(username: string, token?: string): Promise<StreakData> {
  const since = new Date();
  since.setDate(since.getDate() - 90);
  const sinceStr = since.toISOString().slice(0, 10);

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const url = `${GITHUB_API}/search/commits?q=author:${username}+author-date:>=${sinceStr}&per_page=100&sort=author-date&order=desc`;
  const res = await fetch(url, { headers, cache: "no-store" });

  if (!res.ok) {
    console.error(`GitHub API error fetching streak for badge:`, {
      status: res.status,
      username,
    });
    return { current: 0, longest: 0, lastCommitDate: null, totalActiveDays: 0 };
  }

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
  const runs: { start: string; end: string; length: number }[] = [];
  let runStart = commitDays[0];

  for (let i = 1; i < commitDays.length; i++) {
    const diff = dateDiffDays(commitDays[i - 1], commitDays[i]);
    if (diff === 1) {
      currentRun++;
      if (currentRun > longestStreak) longestStreak = currentRun;
    } else {
      runs.push({ start: runStart, end: commitDays[i - 1], length: currentRun });
      runStart = commitDays[i];
      currentRun = 1;
    }
  }
  runs.push({ start: runStart, end: commitDays[commitDays.length - 1], length: currentRun });

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

function errorBadge(): NextResponse {
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
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(req: NextRequest) {
  try {
    const username = req.nextUrl.searchParams.get("user");

    if (!username || !GITHUB_USERNAME_RE.test(username)) {
      return NextResponse.json({ error: "Invalid username" }, { status: 400 });
    }

    const cacheKey = `badge:streak:${username}`;
    const cached = await cacheGet<StreakData>(cacheKey);

    let streak: StreakData;
    if (cached !== null) {
      streak = cached;
    } else {
      const githubToken = process.env.GITHUB_TOKEN;
      streak = await fetchStreak(username, githubToken);
      await cacheSet(cacheKey, streak, BADGE_CACHE_TTL);
    }

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
        "Cache-Control": "s-maxage=3600, stale-while-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Error generating streak badge:", error);
    return errorBadge();
  }
}
