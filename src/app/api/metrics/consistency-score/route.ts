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
import { calculateConsistencyScore } from "@/lib/consistency-score";
import { fetchActiveDates as fetchActiveDatesShared } from "@/lib/streak";

export const dynamic = "force-dynamic";

const LOOKBACK_DAYS = 365;

async function fetchActiveDates(
  githubLogin: string,
  token: string,
  cacheContext: { bypass: boolean; userId: string },
  timeZone = "UTC",
): Promise<Set<string>> {
  const key = metricsCacheKey(cacheContext.userId, "streak", { githubLogin });

  const dates = await withMetricsCache(
    {
      bypass: cacheContext.bypass,
      key,
      ttlSeconds: METRICS_CACHE_TTL_SECONDS.streak,
    },
    async () => {
      const activeDates = await fetchActiveDatesShared(githubLogin, token, LOOKBACK_DAYS, timeZone);
      return Array.from(activeDates);
    },
  );

  return new Set(dates);
}

async function getConsistencyScoreForDates(
  activeDates: Set<string>,
  timeZone: string,
  cacheContext: { bypass: boolean; userId: string; accountKey: string },
) {
  const key = `metrics:${cacheContext.userId}:consistency-score:${cacheContext.accountKey}`;

  return withMetricsCache(
    {
      bypass: cacheContext.bypass,
      key,
      ttlSeconds: METRICS_CACHE_TTL_SECONDS.streak,
    },
    async () => calculateConsistencyScore(activeDates, timeZone),
  );
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken || !session.githubLogin || !session.githubId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accountId = req.nextUrl.searchParams.get("accountId");
  const bypass = isMetricsCacheBypassed(req);

  const userRow = await resolveAppUser(session.githubId, session.githubLogin);
  const appUserId = userRow?.id ?? null;

  if (accountId && !appUserId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let timeZone = "UTC";
  if (appUserId) {
    const { data: tzRow } = await supabaseAdmin
      .from("users")
      .select("timezone")
      .eq("id", appUserId)
      .single();
    if (tzRow?.timezone) timeZone = tzRow.timezone;
  }

  if (!accountId) {
    try {
      const activeDates = await fetchActiveDates(
        session.githubLogin,
        session.accessToken,
        { bypass, userId: session.githubId },
        timeZone,
      );
      const result = await getConsistencyScoreForDates(activeDates, timeZone, {
        bypass,
        userId: session.githubId,
        accountKey: "default",
      });
      return Response.json(result);
    } catch {
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
      appUserId,
    );

    const dateResults = await Promise.allSettled(
      accounts.map((account) =>
        fetchActiveDates(
          account.githubLogin,
          account.token,
          { bypass, userId: account.githubId },
          timeZone,
        ),
      ),
    );

    const unifiedDates = new Set<string>();
    for (const result of dateResults) {
      if (result.status === "fulfilled") {
        result.value.forEach((date) => unifiedDates.add(date));
      }
    }

    const scoreData = await getConsistencyScoreForDates(unifiedDates, timeZone, {
      bypass,
      userId: appUserId,
      accountKey: "combined",
    });

    return Response.json(scoreData);
  }

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
      { bypass, userId: accountId },
      timeZone,
    );
    const result = await getConsistencyScoreForDates(activeDates, timeZone, {
      bypass,
      userId: accountId,
      accountKey: accountId,
    });
    return Response.json(result);
  } catch {
    return Response.json({ error: "GitHub API error" }, { status: 502 });
  }
}
