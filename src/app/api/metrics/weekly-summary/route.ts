import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";
import { GITHUB_API } from "@/lib/github";
import { GitHubAuthError, githubAuthErrorResponse } from "@/lib/github-fetch";
import { isMetricsCacheBypassed, metricsCacheKey, withMetricsCache } from "@/lib/metrics-cache";
import { getAccountToken } from "@/lib/github-accounts";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveAppUser } from "@/lib/resolve-user";
import { calculateStreak } from "@/lib/streak";
import { toDateStr } from "@/lib/dateUtils";

export const dynamic = "force-dynamic";

// Returns the start of the current week (Monday 00:00:00 UTC).
// All week boundary comparisons use UTC to stay consistent with GitHub's
// commit timestamps, which are always returned in UTC.
function getCurrentWeekStartUtc(): Date {
  const now = new Date();
  const currentWeekStart = new Date(now);
  const dayOfWeek = currentWeekStart.getUTCDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  currentWeekStart.setUTCDate(currentWeekStart.getUTCDate() - daysSinceMonday);
  currentWeekStart.setUTCHours(0, 0, 0, 0);
  return currentWeekStart;
}

function calculateCurrentStreak(activeDates: Set<string>): number {
  const { currentStreak } = calculateStreak(
    Array.from(activeDates).map((day) => new Date(day))
  );
  return currentStreak;
}

async function fetchActiveDates(githubLogin: string, token: string): Promise<Set<string>> {
  // Look back 90 days — the maximum window the GitHub Commit Search API supports.
  const since = new Date();
  since.setDate(since.getDate() - 90);
  const sinceStr = since.toISOString().slice(0, 10); // "YYYY-MM-DD"

  const activeDates = new Set<string>();
  let page = 1;

  // GitHub Commit Search API rate limits:
  //   • Authenticated (OAuth token / PAT): 30 requests/minute
  //   • Unauthenticated:                   10 requests/minute
  //
  // This loop pages up to 10 pages (1,000 commits max) to cover the 90-day window.
  // Each page = 1 request against the 30 req/min quota.
  // NOTE: this function is called INSIDE withMetricsCache in the GET handler,
  // so it only runs on a cache miss — repeated page loads reuse cached dates.
  while (true) {
    const searchRes = await fetch(
      `${GITHUB_API}/search/commits?q=author:${githubLogin}+author-date:>=${sinceStr}&per_page=100&page=${page}&sort=author-date&order=desc`,
      {
        headers: {
          // OAuth token / PAT: raises the Search API limit from 10 → 30 req/min.
          // Without this, the streak pagination loop could exhaust the unauthenticated
          // quota on its own, blocking all other Search API calls on the same IP.
          Authorization: `Bearer ${token}`,
          // Mandatory Accept header for the Commit Search endpoint.
          // Omitting it causes GitHub to return HTTP 415 (Unsupported Media Type).
          Accept: "application/vnd.github+json",
        },
        cache: "no-store",
      }
    );

    // HTTP 401 = token revoked/invalid. HTTP 403 = rate limit.
    // Both throw so the outer GET handler can distinguish auth failures.
    if (!searchRes.ok) {
      if (searchRes.status === 401) throw new GitHubAuthError();
      throw new Error("GitHub API error");
    }

    const data = (await searchRes.json()) as { items: Array<{ commit: { author: { date: string } } }> };

    // Extract just the "YYYY-MM-DD" date from each commit timestamp.
    // Set deduplicates — multiple commits on the same day count as one active day.
    for (const item of data.items) {
      activeDates.add(item.commit.author.date.slice(0, 10));
    }

    // Stop when GitHub returns fewer than 100 items (last page) or the 10-page cap is hit.
    if (data.items.length < 100 || page >= 10) break;
    page++;
  }

  return activeDates;
}

export async function GET(req: NextRequest) {
  // Session contains the GitHub OAuth token issued at sign-in.
  // Both accessToken and githubLogin are required for all API calls below.
  const session = await getServerSession(authOptions);
  if (!session?.accessToken || !session.githubLogin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.error === "TokenRevoked") {
    return githubAuthErrorResponse();
  }

  const accountId = req.nextUrl.searchParams.get("accountId");
  const bypass = isMetricsCacheBypassed(req);

  let token = session.accessToken;
  let githubLogin = session.githubLogin;
  let userId = session.githubId ?? session.githubLogin;

  if (accountId && accountId !== session.githubId) {
    if (!session.githubId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userRow = await resolveAppUser(session.githubId, session.githubLogin);
    if (!userRow) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const accountToken = await getAccountToken(userRow.id, accountId);
    if (!accountToken) {
      return Response.json({ error: "Account not found" }, { status: 404 });
    }
    const { data: accountRow } = await supabaseAdmin
      .from("user_github_accounts")
      .select("github_login")
      .eq("user_id", userRow.id)
      .eq("github_id", accountId)
      .single();
    if (!accountRow?.github_login) {
      return Response.json({ error: "Account not found" }, { status: 404 });
    }
    token = accountToken;
    githubLogin = accountRow.github_login;
    userId = accountId;
  }

  const key = metricsCacheKey(userId, "weekly-summary" as any);

  try {
    // Cache TTL of 5 minutes (300 seconds).
    // This handler makes 3 GitHub API calls (commits Search, PRs Search, streak Search×N)
    // on every cache miss. Without this cache, rapid refreshes would exhaust the
    // 30 req/min Search API quota almost immediately.
    const data = await withMetricsCache({ bypass, key, ttlSeconds: 5 * 60 }, async () => {
      const currentWeekStart = getCurrentWeekStartUtc();
      const prevWeekStart = new Date(currentWeekStart.getTime() - 7 * 86400000);
      const prevWeekEnd = new Date(currentWeekStart.getTime() - 1);
      // Fetch 14 days of data in a single query so both this week and last week
      // are covered with one Search API request instead of two.
      const fourteenDaysAgoStr = toDateStr(new Date(Date.now() - 14 * 86400000));

      // Search API call 1 of 3 — fetches commits for the past 14 days.
      // Rate limit: counts against the 30 req/min Search API quota.
      // per_page=100 covers most users in a single request; heavy committers
      // (>100 commits in 14 days) will see a capped but still representative count.
      const commitsRes = await fetch(
        `${GITHUB_API}/search/commits?q=author:${githubLogin}+author-date:>=${fourteenDaysAgoStr}&per_page=100`,
        {
          headers: {
            // OAuth token / PAT: required for the authenticated 30 req/min tier.
            Authorization: `Bearer ${token}`,
            // Mandatory Accept header for the Commit Search endpoint.
            Accept: "application/vnd.github+json",
          },
          cache: "no-store",
        }
      );

      // 401 = token revoked — surface immediately so the banner appears.
      // Other non-ok responses (403 rate limit, 5xx) fall back to empty items
      // so the PRs and streak sections still render on rate-limit transients.
      if (!commitsRes.ok && commitsRes.status === 401) throw new GitHubAuthError();
      const commitsData: {
        items: Array<{
          commit: { author: { date: string } };
          repository: { full_name: string };
        }>;
      } = commitsRes.ok
        ? await commitsRes.json()
        : { items: [] };

      let commitsThisWeek = 0;
      let commitsPrevWeek = 0;
      const activeDaysThisWeek = new Set<string>();
      const activeDaysLastWeek = new Set<string>();
      const repoCounts = new Map<string, number>();

      // Partition commits into this week vs last week using UTC week boundaries.
      for (const item of commitsData.items) {
        const commitDate = new Date(item.commit.author.date);

        if (commitDate >= currentWeekStart) {
          commitsThisWeek++;
          activeDaysThisWeek.add(item.commit.author.date.slice(0, 10));

          const repoName = item.repository.full_name;
          repoCounts.set(repoName, (repoCounts.get(repoName) ?? 0) + 1);
        } else if (commitDate >= prevWeekStart && commitDate <= prevWeekEnd) {
          commitsPrevWeek++;
          activeDaysLastWeek.add(item.commit.author.date.slice(0, 10));
        }
      }

      // Find the repo with the most commits this week — shown as "top repo" on the widget.
      let topRepo: string | null = null;
      let topRepoCount = 0;
      Array.from(repoCounts.entries()).forEach(([repoName, count]) => {
        if (count > topRepoCount) {
          topRepo = repoName;
          topRepoCount = count;
        }
      });

      // Search API call 2 of 3 — fetches PRs opened in the past 14 days.
      // Uses the Issues Search endpoint (which covers PRs) with type:pr filter.
      // Rate limit: counts against the same 30 req/min Search API quota as call 1.
      const prsRes = await fetch(
        `${GITHUB_API}/search/issues?q=type:pr+author:@me+created:>=${fourteenDaysAgoStr}&per_page=100`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
          },
          cache: "no-store",
        }
      );

      if (!prsRes.ok) {
        if (prsRes.status === 401) throw new GitHubAuthError();
        throw new Error("GitHub API error");
      }

      const prsData = (await prsRes.json()) as {
        items: Array<{
          created_at: string;
          state: string;
          pull_request?: { merged_at: string | null };
        }>;
      };

      let prsOpenedThisWeek = 0;
      let prsMergedThisWeek = 0;
      let prsOpenedLastWeek = 0;
      let prsMergedLastWeek = 0;

      // Partition PRs into this week vs last week, same boundary logic as commits.
      for (const item of prsData.items) {
        const createdAt = new Date(item.created_at);
        if (Number.isNaN(createdAt.getTime())) continue;
        if (createdAt >= currentWeekStart) {
          prsOpenedThisWeek++;
          if (item.pull_request?.merged_at != null) {
            prsMergedThisWeek++;
          }
        } else if (createdAt >= prevWeekStart && createdAt <= prevWeekEnd) {
          prsOpenedLastWeek++;
          if (item.pull_request?.merged_at != null) {
            prsMergedLastWeek++;
          }
        }
      }

      // Search API calls 3+ — fetchActiveDates pages through up to 10 Search API
      // requests to build the full 90-day commit date set for streak calculation.
      // This is the most expensive part of this handler in terms of API quota usage.
      // The 5-minute cache TTL above ensures these calls only happen on cache misses.
      const streakDates = await fetchActiveDates(githubLogin!, token!);
      const commitDelta = commitsThisWeek - commitsPrevWeek;

      return {
        commits: {
          current: commitsThisWeek,
          previous: commitsPrevWeek,
          delta: commitDelta,
          // "up" / "down" / "same" trend indicator for the dashboard UI arrow.
          trend: commitDelta > 0 ? "up" : commitDelta < 0 ? "down" : "same",
        },
        prs: {
          thisWeek: { opened: prsOpenedThisWeek, merged: prsMergedThisWeek },
          lastWeek: { opened: prsOpenedLastWeek, merged: prsMergedLastWeek },
        },
        activeDays: {
          thisWeek: activeDaysThisWeek.size,
          lastWeek: activeDaysLastWeek.size,
        },
        streak: calculateCurrentStreak(streakDates),
        topRepo,
      };
    });
    return Response.json(data);
  } catch (e) {
    if (e instanceof GitHubAuthError) return githubAuthErrorResponse();
    return Response.json({ error: "GitHub API error" }, { status: 502 });
  }
}
