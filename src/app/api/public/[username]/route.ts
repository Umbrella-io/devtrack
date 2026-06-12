// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { fetchPublicProfile } from "@/lib/public-profile-data";
import { getUpstashConfig, upstashRateLimitFixedWindow } from "@/lib/upstash-rest";
import { createMemoryFixedWindowRateLimiter, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * GitHub usernames: 1–39 chars, alphanumeric or single hyphens,
 * cannot start or end with a hyphen.
 * https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-personal-account-on-github/managing-user-account-settings/github-username-policy
 */
const GITHUB_USERNAME_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

/**
 * In-memory rate limiter for IP addresses.
 * Maps IP -> { count: number, resetAt: number }
 * This resets on server restart. For production, use Redis.
 */
const RATE_LIMIT_REQUESTS = 30;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MEMORY_MAX_ENTRIES = Number(process.env.MEMORY_RATE_LIMIT_MAX_ENTRIES ?? 10_000);
const memoryLimiter = createMemoryFixedWindowRateLimiter({
  windowMs: RATE_LIMIT_WINDOW_MS,
  pruneIntervalMs: 5 * 60 * 1000,
  maxEntries: Number.isFinite(MEMORY_MAX_ENTRIES) ? MEMORY_MAX_ENTRIES : 10_000,
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
): Promise<NextResponse> {
  const { username } = await params;

  // Validate username before touching any downstream service.
  // Rejects path-traversal attempts (../../admin), null-byte injections
  // (%00injected), and anything that could not be a real GitHub username.
  if (!GITHUB_USERNAME_RE.test(username)) {
    return NextResponse.json(
      { error: "Invalid username" },
      { status: 400 }
    );
  }

  // Deterministic mock for Playwright visual regression tests
  if (process.env.PLAYWRIGHT_TEST === "true" && username === "playwright-user") {
    return NextResponse.json({
      username: "playwright-user",
      bio: "Automated test account",
      isSponsor: true,
      publicGists: 5,
      memberSince: "2024-01-01T00:00:00.000Z",
      repos: [
        {
          name: "demo-repo",
          description: "Demo repository",
          stargazers_count: 10,
          forks_count: 2,
          language: "TypeScript",
          html_url: "https://github.com/playwright-user/demo-repo",
          last_commit_date: "2026-06-01T10:00:00.000Z",
        }
      ],
      contributions: { totalContributions: 150, weeks: [] },
      streak: { currentStreak: 5, longestStreak: 10, totalContributions: 150 },
      topLanguages: [{ name: "TypeScript", count: 10, percentage: 100 }],
      pullRequests: 12,
      achievements: [],
      weeklyGoalProgress: { completed: 2, total: 3, percentage: 66 },
      publicWidgets: ["streak", "contributions", "languages", "prs"],
      victoryBadges: 5,
    });
  }


  // Rate limiting
  const ip = getClientIp(req);
  const rateLimit = getUpstashConfig()
    ? await upstashRateLimitFixedWindow({
        key: `public-profile-rate-limit:${ip}`,
        limit: RATE_LIMIT_REQUESTS,
        windowSeconds: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
      })
    : (() => {
        const local = memoryLimiter.check(
          `public-profile-rate-limit:${ip}`,
          RATE_LIMIT_REQUESTS
        );
        return local.allowed
          ? { allowed: true }
          : {
              allowed: false,
              retryAfter: Math.max(
                local.reset - Math.floor(Date.now() / 1000),
                1
              ),
            };
      })();

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

  const profile = await fetchPublicProfile(username);

  if (!profile) {
    return NextResponse.json(
      { error: "User not found or profile is not public" },
      { status: 404 }
    );
  }

  return NextResponse.json(profile);
}