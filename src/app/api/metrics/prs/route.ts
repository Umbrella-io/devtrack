import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";
import {
  getAccountToken,
  getAllAccounts,
  mergeMetrics,
} from "@/lib/github-accounts";
import { GITHUB_API } from "@/lib/github";
import {
  isMetricsCacheBypassed,
  METRICS_CACHE_TTL_SECONDS,
  metricsCacheKey,
  withMetricsCache,
} from "@/lib/metrics-cache";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveAppUser } from "@/lib/resolve-user";

export const dynamic = "force-dynamic";

interface PRMetricsBase {
  open: number;
  merged: number;
  closed: number;
  total: number;
  avgReviewHours: number;
  mergeRate: number;
}

interface PRTimeDistribution {
  lessThan1h: number;
  from1hTo24h: number;
  from1dTo7d: number;
  moreThan7d: number;
}

async function fetchPRMetrics(
  token: string,
  days: number = 30,
): Promise<PRMetricsBase & { timeDistribution: PRTimeDistribution }> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = `${since.getFullYear()}-${String(since.getMonth() + 1).padStart(2, "0")}-${String(since.getDate()).padStart(2, "0")}`;

  const searchRes = await fetch(
    `${GITHUB_API}/search/issues?q=type:pr+author:@me+created:>=${sinceStr}&per_page=100`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );

  if (!searchRes.ok) {
    throw new Error("GitHub API error");
  }

  const data = (await searchRes.json()) as {
    total_count: number;
    items: Array<{
      state: string;
      created_at: string;
      closed_at: string | null;
      // GitHub Search API includes a pull_request object on PR items.
      // merged_at is non-null only when the PR was actually merged, as
      // opposed to closed without merging.
      pull_request?: { merged_at: string | null };
    }>;
  };

  const open = data.items.filter((pr) => pr.state === "open").length;

  // A PR with state "closed" may have been merged OR closed without merging
  // (e.g. rejected, abandoned). Only count those with a non-null merged_at
  // as truly merged so the dashboard does not inflate the merged count.
  const merged = data.items.filter(
    (pr) => pr.pull_request?.merged_at != null
  ).length;

  // Closed without merging (rejected / abandoned)
  const closed = data.items.filter(
    (pr) => pr.state === "closed" && pr.pull_request?.merged_at == null
  ).length;

  // Average review time: use only actually merged PRs so we measure the time
  // from open to merge, not open to close-without-merge.
  const mergedPRs = data.items.filter(
    (pr) => pr.pull_request?.merged_at != null
  );
  const avgReviewMs =
    mergedPRs.length > 0
      ? mergedPRs.reduce(
          (sum, pr) =>
            sum +
            (new Date(pr.pull_request!.merged_at!).getTime() -
              new Date(pr.created_at).getTime()),
          0,
        ) / mergedPRs.length
      : 0;

  // Calculate time distribution
  const timeDistribution: PRTimeDistribution = {
    lessThan1h: 0,
    from1hTo24h: 0,
    from1dTo7d: 0,
    moreThan7d: 0,
  };

  for (const pr of mergedPRs) {
    const durationMs =
      new Date(pr.pull_request!.merged_at!).getTime() - new Date(pr.created_at).getTime();

    if (durationMs < 3600000) {
      // Less than 1 hour
      timeDistribution.lessThan1h++;
    } else if (durationMs < 86400000) {
      // 1 hour to 24 hours
      timeDistribution.from1hTo24h++;
    } else if (durationMs < 604800000) {
      // 1 day to 7 days
      timeDistribution.from1dTo7d++;
    } else {
      // More than 7 days
      timeDistribution.moreThan7d++;
    }
  }

          0
        ) / mergedPRs.length
      : 0;

  // Use the number of fetched items as the denominator for mergeRate.
  // data.total_count is the all-time GitHub total (potentially thousands)
  // while data.items is capped at 100, so dividing merged/total_count
  // produces a near-zero rate for any active user. The fetched sample
  // (open + merged + closed-without-merge) is the correct base.
  const sampleTotal = data.items.length;

  return {
    open,
    merged,
    closed,
    total: data.total_count,
    avgReviewHours: Math.round(avgReviewMs / 3600000),
    mergeRate: sampleTotal > 0 ? merged / sampleTotal : 0,
    timeDistribution,
  };
}


function formatPRMetrics(
  metrics: PRMetricsBase & { timeDistribution: PRTimeDistribution },
) {

async function fetchCachedPRMetrics(
  token: string,
  cacheContext: { bypass: boolean; userId: string }
): Promise<PRMetricsBase> {
  const key = metricsCacheKey(cacheContext.userId, "prs");

  return withMetricsCache(
    {
      bypass: cacheContext.bypass,
      key,
      ttlSeconds: METRICS_CACHE_TTL_SECONDS.prs,
    },
    () => fetchPRMetrics(token)
  );
}

function formatPRMetrics(metrics: PRMetricsBase) {

  return {
    open: metrics.open,
    merged: metrics.merged,
    closed: metrics.closed,
    total: metrics.total,
    avgReviewHours: metrics.avgReviewHours,
    mergeRate:
      metrics.total > 0 ? `${Math.round(metrics.mergeRate * 100)}%` : "0%",
    timeDistribution: metrics.timeDistribution,
  };
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accountId = req.nextUrl.searchParams.get("accountId");

  const days = Number(req.nextUrl.searchParams.get("days")) || 30;

  if (!accountId) {
    try {
      const result = await fetchPRMetrics(session.accessToken, days);

  const bypass = isMetricsCacheBypassed(req);

  if (!accountId) {
    try {
      const result = await fetchCachedPRMetrics(session.accessToken, {
        bypass,
        userId: session.githubId ?? session.githubLogin ?? "primary",
      });

      return Response.json(formatPRMetrics(result));
    } catch {
      return Response.json({ error: "GitHub API error" }, { status: 502 });
    }
  }

  if (!session.githubId || !session.githubLogin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRow = await resolveAppUser(session.githubId, session.githubLogin);

  if (!userRow) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (accountId === "combined") {
    const accounts = await getAllAccounts(
      {
        token: session.accessToken,
        githubId: session.githubId,
        githubLogin: session.githubLogin,
      },
      userRow.id,
    );

    const results = await Promise.allSettled(

      accounts.map((account) => fetchPRMetrics(account.token, days)),

      accounts.map((account) =>
        fetchCachedPRMetrics(account.token, { bypass, userId: account.githubId })
      )

    );

    const merged = mergeMetrics(results, (a, b) => {
      const total = a.total + b.total;
      const mergedCount = a.merged + b.merged;
      const closedCount = a.closed + b.closed;
      const avgReviewHours =
        total > 0
          ? (a.avgReviewHours * a.total + b.avgReviewHours * b.total) / total
          : 0;

      return {
        open: a.open + b.open,
        merged: mergedCount,
        closed: closedCount,
        total,
        avgReviewHours: Math.round(avgReviewHours * 10) / 10,
        mergeRate:
          total > 0 ? Math.round((mergedCount / total) * 100) / 100 : 0,
        timeDistribution: {
          lessThan1h:
            a.timeDistribution.lessThan1h + b.timeDistribution.lessThan1h,
          from1hTo24h:
            a.timeDistribution.from1hTo24h + b.timeDistribution.from1hTo24h,
          from1dTo7d:
            a.timeDistribution.from1dTo7d + b.timeDistribution.from1dTo7d,
          moreThan7d:
            a.timeDistribution.moreThan7d + b.timeDistribution.moreThan7d,
        },
      };
    });

    if (!merged) {
      return Response.json({ error: "GitHub API error" }, { status: 502 });
    }

    return Response.json(formatPRMetrics(merged));
  }

  const token =
    accountId === session.githubId
      ? session.accessToken
      : await getAccountToken(userRow.id, accountId);

  if (!token) {
    return Response.json({ error: "Account not found" }, { status: 404 });
  }

  try {

    const result = await fetchPRMetrics(token, days);

    const result = await fetchCachedPRMetrics(token, {
      bypass,
      userId: accountId === session.githubId ? session.githubId : accountId,
    });

    return Response.json(formatPRMetrics(result));
  } catch {
    return Response.json({ error: "GitHub API error" }, { status: 502 });
  }
}
