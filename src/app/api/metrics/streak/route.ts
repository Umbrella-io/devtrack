import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";
import { getAccountToken, getAllAccounts } from "@/lib/github-accounts";
import { GITHUB_API } from "@/lib/github";
import {
  isMetricsCacheBypassed,
  METRICS_CACHE_TTL_SECONDS,
  metricsCacheKey,
  withMetricsCache,
} from "@/lib/metrics-cache";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveAppUser } from "@/lib/resolve-user";
import { dateDiffDays, toDateStr } from "@/lib/dateUtils";

export const dynamic = "force-dynamic";

async function fetchActiveDates(
  githubLogin: string,
  token: string,
  cacheContext: { bypass: boolean; userId: string }
): Promise<Set<string>> {
  // Cache key is scoped per user + githubLogin so multi-account "combined" view
  // stores each account's dates separately and merges them in the GET handler.
  const key = metricsCacheKey(cacheContext.userId, "streak", { githubLogin });

  // withMetricsCache returns cached dates if available within the TTL window,
  // skipping all GitHub API calls below. This is the primary protection against
  // exhausting the Search API rate limit on repeated page loads.
  const dates = await withMetricsCache(
    {
      bypass: cacheContext.bypass,
      key,
      ttlSeconds: METRICS_CACHE_TTL_SECONDS.streak,
    },
    async () => {
      // Look back 90 days — the maximum window GitHub's Commit Search supports.
      // Requesting beyond 90 days will silently return fewer results.
      const since = new Date();
      since.setDate(since.getDate() - 90);
      const sinceStr = since.toISOString().slice(0, 10); // "YYYY-MM-DD"

      const activeDates = new Set<string>();

      // GitHub Search API rate limits:
      // - Unauthenticated: 10 requests/min
      // - Authenticated (PAT/OAuth token): 30 requests/min
      // This loop fetches up to 10 pages (1000 commits) over the last 90 days.
      // Each page = 1 API request. Active users with many commits may need
      // multiple pages, consuming more of the rate limit budget.
      //
      // What happens when rate limited:
      // - GitHub returns HTTP 429 (Too Many Requests) or HTTP 403 (Forbidden)
      // - The error is thrown and caught by the GET handler
      // - The streak widget shows an error state on the dashboard
      // - User should wait ~1 minute before refreshing
      //
      // How to increase the limit:
      // - Connect a Personal Access Token (PAT) in Settings
      // - PAT increases Search API limit to 30 req/min vs 10 req/min
      let page = 1;

      // GitHub Commit Search API rate limits:
      //   • Authenticated (OAuth token / PAT): 30 requests/minute
      //   • Unauthenticated:                   10 requests/minute
      //
      // This loop pages through up to 10 pages (1,000 commits max) to cover
      // the full 90-day window. Each page = 1 request against the 30 req/min quota.
      // Most users need only 1–2 pages; the cap of 10 prevents runaway API usage
      // for extremely active accounts.
      while (true) {
        const searchRes = await fetch(
          `${GITHUB_API}/search/commits?q=author:${githubLogin}+author-date:>=${sinceStr}&per_page=100&page=${page}&sort=author-date&order=desc`,
          {
            headers: {
              // OAuth token / PAT: raises the Search API limit from 10 → 30 req/min.
              // Without this, a single multi-page streak fetch could exhaust the
              // unauthenticated 10 req/min quota for everyone on the same server IP.
              Authorization: `Bearer ${token}`,
              // The Accept header is mandatory for the Commit Search endpoint.
              // Omitting it causes GitHub to return HTTP 415 (Unsupported Media Type).
              Accept: "application/vnd.github+json",
            },
            cache: "no-store",
          }
        );

        // HTTP 403 = Search API rate limit exceeded ("API rate limit exceeded" in body).
        // HTTP 422 = malformed query (e.g. special characters in githubLogin).
        // Both are thrown here so the outer GET handler returns HTTP 502 to the client,
        // which shows an error state rather than a misleading 0-day streak.
        if (!searchRes.ok) {
          // HTTP 429: Primary rate limit exceeded (too many requests/min).
          // HTTP 403: Secondary rate limit or abuse detection by GitHub.
          // Both are thrown here so the GET handler can return a 502
          // and show a user-friendly error state on the streak widget.
          throw new Error("GitHub API error");
        }

        const data = (await searchRes.json()) as {
          items: Array<{ commit: { author: { date: string } } }>;
        };

        // Extract just the date part ("YYYY-MM-DD") from each commit timestamp.
        // Using a Set deduplicates — multiple commits on the same day count as one active day.
        for (const item of data.items) {
          activeDates.add(item.commit.author.date.slice(0, 10));
        }

        // Stop paginating when:
        // - Fewer than 100 results returned (last page)
        // - Reached 10 pages (1000 commits max to avoid excessive API usage)
        if (data.items.length < 100 || page >= 10) break;
        page++;
      }

      return Array.from(activeDates);
    }
  );

  return new Set(dates);
}

function calculateStreakFromDates(
  activeDates: Set<string>,
  freezeDates: Set<string>
): {
  current: number;
  longest: number;
  lastCommitDate: string | null;
  totalActiveDays: number;
  freezeDates: string[];
} {
  // Merge commit dates with streak freeze dates before calculating.
  // A freeze date counts as an "active" day so it doesn't break the streak,
  // even though no commits were made on that day.
  const combinedDates = new Set<string>([
    ...Array.from(activeDates),
    ...Array.from(freezeDates),
  ]);
  const commitDays = Array.from(combinedDates).sort(); // ascending "YYYY-MM-DD"

  if (commitDays.length === 0) {
    return {
      current: 0,
      longest: 0,
      lastCommitDate: null,
      totalActiveDays: 0,
      freezeDates: Array.from(freezeDates),
    };
  }

  let longestStreak = 1;
  let currentRun = 1;
  const runs: { start: string; end: string; length: number }[] = [];
  let runStart = commitDays[0];

  // Walk the sorted date list and split into consecutive runs.
  // dateDiffDays returns 1 for adjacent calendar days — any gap > 1 breaks the streak.
  for (let i = 1; i < commitDays.length; i++) {
    const diff = dateDiffDays(commitDays[i - 1], commitDays[i]);
    if (diff === 1) {
      // Consecutive day — extend the current run.
      currentRun++;
      if (currentRun > longestStreak) {
        longestStreak = currentRun;
      }
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
  // Push the final run.
  runs.push({
    start: runStart,
    end: commitDays[commitDays.length - 1],
    length: currentRun,
  });

  const lastDay = commitDays[commitDays.length - 1];
  const today = toDateStr(new Date());
  const yesterday = toDateStr(new Date(Date.now() - 86400000));

  // Current streak is alive if the last active day is today OR yesterday.
  // Allowing yesterday prevents the streak from resetting at midnight before
  // the user has had a chance to make their first commit of the new day.
  const lastRun = runs[runs.length - 1];
  const currentStreak =
    lastRun.end === today || lastRun.end === yesterday ? lastRun.length : 0;

  return {
    current: currentStreak,
    longest: longestStreak,
    lastCommitDate: lastDay,
    // totalActiveDays counts only days with real commits or freezes in the 90-day window,
    // not the full streak length — useful for the "active days" stat on the dashboard.
    totalActiveDays: commitDays.length,
    freezeDates: Array.from(freezeDates),
  };
}

export async function GET(req: NextRequest) {
  // Session contains the GitHub OAuth token issued at sign-in.
  // githubLogin and githubId are both required: login for the Search API query,
  // githubId for cache key scoping and multi-account lookups.
  const session = await getServerSession(authOptions);
  if (!session?.accessToken || !session.githubLogin || !session.githubId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accountId = req.nextUrl.searchParams.get("accountId");
  const bypass = isMetricsCacheBypassed(req);
  let appUserId: string | null = null;

  const userRow = await resolveAppUser(session.githubId, session.githubLogin);
  appUserId = userRow?.id ?? null;

  // accountId param requires a resolved app user — without one we can't look
  // up linked accounts or streak freezes stored in Supabase.
  if (accountId && !appUserId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch streak freeze dates from Supabase for the past 90 days.
  // These are merged with commit dates so a freeze day doesn't break the streak.
  // Only fetched when the user has a Supabase row (appUserId is non-null).
  const since = new Date();
  since.setDate(since.getDate() - 90);
  const sinceStr = since.toISOString().slice(0, 10);

  const freezeDates = new Set<string>();
  if (appUserId) {
    const { data: freezes } = await supabaseAdmin
      .from("streak_freezes")
      .select("freeze_date")
      .eq("user_id", appUserId)
      .gte("freeze_date", sinceStr);

    if (Array.isArray(freezes)) {
      for (const row of freezes) {
        freezeDates.add(row.freeze_date);
      }
    }
  }

  // No accountId = use the primary signed-in GitHub account.
  if (!accountId) {
    try {
      const activeDates = await fetchActiveDates(
        session.githubLogin,
        session.accessToken,
        { bypass, userId: session.githubId }
      );
      return Response.json(calculateStreakFromDates(activeDates, freezeDates));
    } catch {
      // Catches GitHub API rate limit errors (HTTP 429/403).
      // Returns 502 so the streak widget shows a user-friendly error state.
      return Response.json({ error: "GitHub API error" }, { status: 502 });
    }
  }

  if (!appUserId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (accountId === "combined") {
    const accounts = await getAllAccounts(
      {
        token: session.accessToken,
        githubId: session.githubId,
        githubLogin: session.githubLogin,
      },
      appUserId
    );

    // Each account makes its own Search API call — N accounts = N requests
    // against the 30 req/min Search API limit. Promise.allSettled is used so
    // one account's rate limit error doesn't block the other accounts from loading.
    const dateResults = await Promise.allSettled(
      accounts.map((account) =>
        fetchActiveDates(account.githubLogin, account.token, {
          bypass,
          userId: account.githubId,
        })
      )
    );

    // Merge active dates across all accounts.
    // Failed accounts (e.g. rate limited) are silently skipped via
    // Promise.allSettled — the streak is calculated from whichever
    // accounts succeeded rather than failing entirely.
    const unifiedDates = new Set<string>();
    for (const result of dateResults) {
      if (result.status === "fulfilled") {
        result.value.forEach((date) => unifiedDates.add(date));
      }
    }

    return Response.json(calculateStreakFromDates(unifiedDates, freezeDates));
  }

  // Single specific account — resolve its token and login from Supabase.
  let resolvedToken = session.accessToken;
  let resolvedLogin = session.githubLogin;

  if (accountId !== session.githubId) {
    const accountToken = await getAccountToken(appUserId, accountId);

    if (!accountToken) {
      return Response.json({ error: "Account not found" }, { status: 404 });
    }

    const { data: accountRow } = await supabaseAdmin
      .from("user_github_accounts")
      .select("github_login")
      .eq("user_id", appUserId)
      .eq("github_id", accountId)
      .single();

    if (!accountRow?.github_login) {
      return Response.json({ error: "Account not found" }, { status: 404 });
    }

    resolvedToken = accountToken;
    resolvedLogin = accountRow.github_login;
  }

  try {
    const activeDates = await fetchActiveDates(resolvedLogin, resolvedToken, {
      bypass,
      userId: accountId,
    });
    return Response.json(calculateStreakFromDates(activeDates, freezeDates));
  } catch {
    // Catches GitHub API rate limit errors (HTTP 429/403).
    return Response.json({ error: "GitHub API error" }, { status: 502 });
  }
}