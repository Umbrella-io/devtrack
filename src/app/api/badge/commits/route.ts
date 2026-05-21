import { NextRequest, NextResponse } from "next/server";
import { generateBadgeSVG } from "../badge-utils";
import { cacheGet, cacheSet } from "@/lib/metrics-cache";

export const dynamic = "force-dynamic";

const GITHUB_API = "https://api.github.com";
const BADGE_CACHE_TTL = 3600;

// GitHub username: alphanumeric and hyphens, no leading/trailing hyphens,
// no consecutive hyphens, 1–39 characters.
const GITHUB_USERNAME_RE = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;

async function fetchCommitsThisMonth(
  username: string,
  token?: string
): Promise<number> {
  const since = new Date();
  since.setDate(1);
  const sinceStr = since.toISOString().slice(0, 10);

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const url = `${GITHUB_API}/search/commits?q=author:${username}+author-date:>=${sinceStr}&per_page=1`;
  const res = await fetch(url, { headers, cache: "no-store" });

  if (!res.ok) {
    console.error(`GitHub API error fetching commits for badge:`, {
      status: res.status,
      username,
    });
    return 0;
  }

  const data = (await res.json()) as { total_count: number };
  return data.total_count || 0;
}

function errorBadge(): NextResponse {
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

    const cacheKey = `badge:commits:${username}`;
    const cached = await cacheGet<number>(cacheKey);

    let commits: number;
    if (cached !== null) {
      commits = cached;
    } else {
      const githubToken = process.env.GITHUB_TOKEN;
      commits = await fetchCommitsThisMonth(username, githubToken);
      await cacheSet(cacheKey, commits, BADGE_CACHE_TTL);
    }

    const svg = generateBadgeSVG({
      label: "📦 Commits",
      value: `${commits} this month`,
      color: "#6366f1",
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
    return errorBadge();
  }
}
