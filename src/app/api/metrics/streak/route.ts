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
import { calculateStreak } from "@/lib/streak";
import { dispatchToAllWebhooks } from "@/lib/webhooks";

export const dynamic = "force-dynamic";

async function fetchActiveDates(
  githubLogin: string,
  token: string,
  cacheContext: { bypass: boolean; userId: string }
  , timeZone = "UTC"
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
          throw new Error("GitHub API error");
        }

        const data = (await searchRes.json()) as {
          items: Array<{ commit: { author: { date: string } } }>;
        };

        // Extract the date part ("YYYY-MM-DD") from each commit timestamp
        // but bucket the commit into the user's local timezone so streaks are
        // calculated relative to the user's day boundaries rather than UTC.
        for (const item of data.items) {
          const commitDate = new Date(item.commit.author.date);
          // Format the commit into a YYYY-MM-DD in the user's timezone.
          const parts = new Intl.DateTimeFormat("en", {
            timeZone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).formatToParts(commitDate);
          const year = parts.find((p) => p.type === "year")?.value;
          const month = parts.find((p) => p.type === "month")?.value;
          const day = parts.find((p) => p.type === "day")?.value;
          if (year && month && day) {
            activeDates.add(`${year}-${month}-${day}`);
          }
        }

        // Stop paginating when GitHub returns fewer than 100 items (last page)
        // or when we hit the 10-page safety cap to avoid excessive API usage.
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
  , timeZone = "UTC"
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

  // Helper: convert "YYYY-MM-DD" -> days since epoch (integer) using UTC
  function dayKeyToDays(d: string): number {
    const [y, m, day] = d.split("-").map((s) => Number(s));
    return Date.UTC(y, m - 1, day) / 86400000;
  }

  // Compute runs of consecutive days (increasing by 1 day)
  const daysNums = commitDays.map(dayKeyToDays).sort((a, b) => a - b);

  let longestStreak = 1;
  let currentRun = 1;
  const runs: { end: string; length: number }[] = [];

  for (let i = 1; i < daysNums.length; i += 1) {
    const diff = daysNums[i] - daysNums[i - 1];
    if (diff === 1) {
      currentRun += 1;
      longestStreak = Math.max(longestStreak, currentRun);
      continue;
    }
    runs.push({ end: commitDays[i - 1], length: currentRun });
    currentRun = 1;
  }
  runs.push({ end: commitDays[commitDays.length - 1], length: currentRun });

  // Compute today/yesterday as YYYY-MM-DD in the user's timezone
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = parts.find((p) => p.type === "year")?.value ?? "0000";
  const m = parts.find((p) => p.type === "month")?.value ?? "00";
  const d = parts.find((p) => p.type === "day")?.value ?? "00";
  const today = `${y}-${m}-${d}`;

  // Yesterday computed by converting today's YYYY-MM-DD to UTC days and subtracting 1
  const todayDays = dayKeyToDays(today);
  const yesterdayDays = todayDays - 1;
  const yesterdayDate = new Date(yesterdayDays * 86400000);
  const yParts = new Intl.DateTimeFormat("en", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(yesterdayDate);
  const yy = yParts.find((p) => p.type === "year")?.value ?? "0000";
  const mm = yParts.find((p) => p.type === "month")?.value ?? "00";
  const dd = yParts.find((p) => p.type === "day")?.value ?? "00";
  const yesterday = `${yy}-${mm}-${dd}`;

  const lastRun = runs[runs.length - 1];

  return {
    current:
      lastRun.end === today || lastRun.end === yesterday ? lastRun.length : 0,
    longest: longestStreak,
    lastCommitDate: commitDays[commitDays.length - 1],
    // totalActiveDays counts only days with real commits or freezes in the 90-day window,
    // not the full streak length — useful for the "active days" stat on the dashboard.
    totalActiveDays: commitDays.length,
    freezeDates: Array.from(freezeDates),
  };
}

async function checkAndRecordMilestone(
  userId: string,
  currentStreak: number
): Promise<void> {
  if (currentStreak < 7 || currentStreak % 7 !== 0) return;

  const { error } = await supabaseAdmin
    .from("streak_milestones")
    .upsert(
      { user_id: userId, streak_count: currentStreak },
      { onConflict: "user_id,streak_count" }
    );

  if (!error) {
    dispatchToAllWebhooks(userId, "streak.milestone", {
      streakCount: currentStreak,
      achievedAt: new Date().toISOString(),
    }).catch(() => {});
  }
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

  // Resolve the user's timezone (stored on the Supabase users row). Default to UTC.
  let timeZone = "UTC";
  if (appUserId) {
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("timezone")
      .eq("id", appUserId)
      .single();
    if (userRow?.timezone) timeZone = userRow.timezone;
  }

  // No accountId = use the primary signed-in GitHub account.
  if (!accountId) {
    try {
      const activeDates = await fetchActiveDates(
        session.githubLogin,
        session.accessToken,
        { bypass, userId: session.githubId },
        timeZone
      );
      const streakData = calculateStreakFromDates(activeDates, freezeDates, timeZone);

      if (appUserId && streakData.current > 0) {
        checkAndRecordMilestone(appUserId, streakData.current).catch(() => {});
      }

      return Response.json(streakData);
    } catch {
      // fetchActiveDates throws on GitHub API errors (rate limit, network failure).
      // Return 502 so the client shows an error state rather than a false 0-day streak.
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
        }, timeZone)
      )
    );

    // Union all dates across accounts — a commit on any linked account counts
    // as an active day, so the combined streak reflects total coding activity.
    const unifiedDates = new Set<string>();
    for (const result of dateResults) {
      if (result.status === "fulfilled") {
        result.value.forEach((date) => unifiedDates.add(date));
      }
    }

    const streakData = calculateStreakFromDates(unifiedDates, freezeDates, timeZone);

    if (streakData.current > 0) {
      checkAndRecordMilestone(appUserId, streakData.current).catch(() => {});
    }

    return Response.json(streakData);
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
    const activeDates = await fetchActiveDates(
      resolvedLogin,
      resolvedToken,
      {
        bypass,
        userId: accountId,
      },
      timeZone
    );
    const streakData = calculateStreakFromDates(activeDates, freezeDates, timeZone);

    if (accountId === session.githubId && streakData.current > 0) {
      checkAndRecordMilestone(appUserId, streakData.current).catch(() => {});
    }

    return Response.json(streakData);
  } catch {
    return Response.json({ error: "GitHub API error" }, { status: 502 });
  }
}
