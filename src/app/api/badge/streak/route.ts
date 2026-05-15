import { NextRequest, NextResponse } from "next/server";
import { generateBadgeSVG } from "../badge-utils";

export const dynamic = "force-dynamic";

const GITHUB_API = "https://api.github.com";

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

function dateDiffDays(a: string, b: string): number {
  return (
    (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24)
  );
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
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

export async function GET(req: NextRequest) {
  try {
    const username = req.nextUrl.searchParams.get("user");

    if (!username) {
      return NextResponse.json(
        { error: "Missing 'user' query parameter" },
        { status: 400 }
      );
    }

    // Validate username is a string and not too long
    if (typeof username !== "string" || username.length > 50) {
      return NextResponse.json(
        { error: "Invalid username" },
        { status: 400 }
      );
    }

    console.log(`Fetching streak badge for user: ${username}`);

    // Use GITHUB_TOKEN env var if available for higher rate limits
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      console.warn("⚠️ GITHUB_TOKEN not set - using unauthenticated API (60 req/hour limit)");
    }

    // Fetch streak data
    const streak = await fetchStreak(username, githubToken);
    console.log(`Streak data for ${username}:`, streak);

    // Generate SVG badge
    const svg = generateBadgeSVG({
      label: "🔥 Streak",
      value: `${streak.current} days`,
      color: streak.current > 0 ? "#f59e0b" : "#6366f1", // Orange for active streak, indigo for none
      labelColor: "#333333",
    });

    return new NextResponse(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml;charset=utf-8",
        "Cache-Control": "max-age=3600, public",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Error generating streak badge:", error);

    // Return error badge
    const svg = generateBadgeSVG({
      label: "Streak",
      value: "Error",
      color: "#ef4444",
      labelColor: "#333333",
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
