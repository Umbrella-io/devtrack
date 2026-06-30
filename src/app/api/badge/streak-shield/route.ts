import { NextRequest, NextResponse } from "next/server";
import { generateBadgeSVG } from "../badge-utils";
import { checkBadgeRateLimit, getBadgeClientIp } from "@/lib/badge-rate-limit";
import { calculateStreakFromDates, fetchActiveDates } from "@/lib/streak";
import { logError } from "@/lib/error-handler";
import { normalizeGitHubUsername } from "@/lib/validate-github-username";
import { GitHubRateLimitError } from "@/lib/github-fetch";

export const dynamic = "force-dynamic";

const GITHUB_API = "https://api.github.com";

interface StreakData {
  current: number;
  longest: number;
  lastCommitDate: string | null;
  totalActiveDays: number;
  stale?: boolean;
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
  try {
    const activeDates = await fetchActiveDates(username, token);
    const result = calculateStreakFromDates(activeDates);
    return {
      current: result.current,
      longest: result.longest,
      lastCommitDate: result.lastCommitDate,
      totalActiveDays: result.totalActiveDays,
    };
  } catch (error) {
    if (error instanceof GitHubRateLimitError) {
      console.error(`GitHub API rate limit fetching streak for ${username}:`, error);
      return {
        current: 0,
        longest: 0,
        lastCommitDate: null,
        totalActiveDays: 0,
        stale: true,
      };
    }
    throw error;
  }
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
    const username = normalizeGitHubUsername(
      req.nextUrl.searchParams.get("user")
    );

    if (!username) {
      return NextResponse.json(
        { error: "Invalid GitHub username" },
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
    logError(error, {
      endpoint: "/api/badge/streak-shield",
      operation: "generate_badge",
      additionalContext: {
        username: req.nextUrl.searchParams.get("user"),
      },
    });

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
