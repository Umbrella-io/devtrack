import { NextRequest, NextResponse } from "next/server";
import { generateBadgeSVG } from "../badge-utils";

export const dynamic = "force-dynamic";

const GITHUB_API = "https://api.github.com";

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

async function fetchCommitsThisMonth(
  username: string,
  token?: string
): Promise<number> {
  const since = new Date();
  since.setDate(1); // First day of current month
  const sinceStr = since.toISOString().slice(0, 10);

  const url = `${GITHUB_API}/search/commits?q=author:${username}+author-date:>=${sinceStr}&per_page=1`;
  const searchRes = await fetchGitHubWithToken(url, token);

  if (!searchRes.ok) {
    const errorBody = await searchRes.text();
    console.error(`GitHub API error fetching commits for ${username}:`, {
      status: searchRes.status,
      url,
      body: errorBody,
    });
    return 0;
  }

  const data = (await searchRes.json()) as {
    total_count: number;
  };

  return data.total_count || 0;
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

    console.log(`Fetching commits badge for user: ${username}`);

    // Use GITHUB_TOKEN env var if available for higher rate limits
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      console.warn("⚠️ GITHUB_TOKEN not set - using unauthenticated API (60 req/hour limit)");
    }

    // Fetch commits data
    const commits = await fetchCommitsThisMonth(username, githubToken);
    console.log(`Commits for ${username}: ${commits}`);

    // Generate SVG badge
    const svg = generateBadgeSVG({
      label: "📦 Commits",
      value: `${commits} this month`,
      color: "#6366f1", // DevTrack indigo
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
    console.error("Error generating commits badge:", error);

    // Return error badge
    const svg = generateBadgeSVG({
      label: "Commits",
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
