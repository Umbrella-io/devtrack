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
import { calculateStreakFromDates, fetchActiveDates as fetchActiveDatesShared } from "@/lib/streak";
import { dispatchToAllWebhooks } from "@/lib/webhooks";

export const dynamic = "force-dynamic";

const STREAK_LOOKBACK_DAYS = 365;

async function fetchActiveDates(
  githubLogin: string,
  token: string,
  cacheContext: { bypass: boolean; userId: string },
  timeZone = "UTC"
): Promise<Set<string>> {
  const key = metricsCacheKey(cacheContext.userId, "streak", { githubLogin });

  const dates = await withMetricsCache(
    {
      bypass: cacheContext.bypass,
      key,
      ttlSeconds: METRICS_CACHE_TTL_SECONDS.streak,
    },
    async () => {
      const activeDates = await fetchActiveDatesShared(githubLogin, token, STREAK_LOOKBACK_DAYS, timeZone);
      return Array.from(activeDates);
    }
  );

  return new Set(dates);
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

  // Fetch streak freeze dates from Supabase for the past STREAK_LOOKBACK_DAYS.
  // These are merged with commit dates so a freeze day doesn't break the streak.
  // Only fetched when the user has a Supabase row (appUserId is non-null).
  const since = new Date();
  since.setDate(since.getDate() - STREAK_LOOKBACK_DAYS);
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
