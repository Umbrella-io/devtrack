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
  total: number;
  avgReviewHours: number;
  avgFirstReviewHours: number | null;
  mergeRate: number;
}

interface PRTimeDistribution {
  lessThan1h: number;
  from1hTo24h: number;
  from1dTo7d: number;
  moreThan7d: number;
}

interface PullRequestSearchItem {
  state: string;
  created_at: string;
  closed_at: string | null;
  number: number;
  repository_url: string;
  pull_request?: { merged_at: string | null };
}

interface ReviewEvent {
  submitted_at?: string | null;
}

interface ReviewCommentEvent {
  created_at?: string | null;
}

function getRepoFullName(repositoryUrl: string): string | null {
  const marker = "/repos/";
  const index = repositoryUrl.indexOf(marker);
  return index >= 0 ? repositoryUrl.slice(index + marker.length) : null;
}

function getEarliestTimestamp(values: Array<string | null | undefined>) {
  const timestamps = values
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter((value) => !Number.isNaN(value));

  return timestamps.length > 0 ? Math.min(...timestamps) : null;
}

async function fetchFirstReviewTimestamp(
  token: string,
  pr: PullRequestSearchItem
): Promise<number | null> {
  const repo = getRepoFullName(pr.repository_url);

  if (!repo) {
    return null;
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
  };
  const [reviewsRes, commentsRes] = await Promise.all([
    fetch(`${GITHUB_API}/repos/${repo}/pulls/${pr.number}/reviews?per_page=100`, {
      headers,
      cache: "no-store",
    }),
    fetch(`${GITHUB_API}/repos/${repo}/pulls/${pr.number}/comments?per_page=100`, {
      headers,
      cache: "no-store",
    }),
  ]);

  if (!reviewsRes.ok || !commentsRes.ok) {
    return null;
  }

  const reviews = (await reviewsRes.json()) as ReviewEvent[];
  const comments = (await commentsRes.json()) as ReviewCommentEvent[];

  return getEarliestTimestamp([
    ...reviews.map((review) => review.submitted_at),
    ...comments.map((comment) => comment.created_at),
  ]);
}

async function getAverageFirstReviewHours(
  token: string,
  prs: PullRequestSearchItem[]
): Promise<number | null> {
  const reviewedPrs = await Promise.all(
    prs.slice(0, 30).map(async (pr) => {
      const firstReviewAt = await fetchFirstReviewTimestamp(token, pr);

      if (!firstReviewAt) {
        return null;
      }

      const openedAt = new Date(pr.created_at).getTime();
      if (Number.isNaN(openedAt) || firstReviewAt < openedAt) {
        return null;
      }

      return (firstReviewAt - openedAt) / 3600000;
    })
  );
  const validDurations = reviewedPrs.filter(
    (value): value is number => typeof value === "number"
  );

  if (validDurations.length === 0) {
    return null;
  }

  const average =
    validDurations.reduce((sum, value) => sum + value, 0) /
    validDurations.length;

  return Math.round(average * 10) / 10;
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
    items: PullRequestSearchItem[];
  };

  const open = data.items.filter((pr) => pr.state === "open").length;

  const merged = data.items.filter(
    (pr) => pr.pull_request?.merged_at != null
  ).length;

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
          0
        ) / mergedPRs.length
      : 0;

  const sampleTotal = data.items.length;
  const avgFirstReviewHours = await getAverageFirstReviewHours(
    token,
    data.items
  );

  const closedPRs = data.items.filter(
    (pr) => pr.state === "closed" && pr.closed_at != null
  );

  const timeDistribution: PRTimeDistribution = {
    lessThan1h: 0,
    from1hTo24h: 0,
    from1dTo7d: 0,
    moreThan7d: 0,
  };

  for (const pr of closedPRs) {
    const durationMs =
      new Date(pr.closed_at!).getTime() - new Date(pr.created_at).getTime();

    if (durationMs < 3600000) {
      timeDistribution.lessThan1h++;
    } else if (durationMs < 86400000) {
      timeDistribution.from1hTo24h++;
    } else if (durationMs < 604800000) {
      timeDistribution.from1dTo7d++;
    } else {
      timeDistribution.moreThan7d++;
    }
  }

  return {
    open,
    merged,
    total: data.total_count,
    avgReviewHours: Math.round(avgReviewMs / 3600000),
    avgFirstReviewHours,
    mergeRate: sampleTotal > 0 ? merged / sampleTotal : 0,
    timeDistribution,
  };
}

async function fetchCachedPRMetrics(
  token: string,
  days: number,
  cacheContext: { bypass: boolean; userId: string }
): Promise<PRMetricsBase & { timeDistribution: PRTimeDistribution }> {
  const key = metricsCacheKey(cacheContext.userId, "prs");

  return withMetricsCache(
    {
      bypass: cacheContext.bypass,
      key,
      ttlSeconds: METRICS_CACHE_TTL_SECONDS.prs,
    },
    () => fetchPRMetrics(token, days)
  );
}

function formatPRMetrics(
  metrics: PRMetricsBase & { timeDistribution: PRTimeDistribution },
) {
  return {
    open: metrics.open,
    merged: metrics.merged,
    total: metrics.total,
    avgReviewHours: metrics.avgReviewHours,
    avgFirstReviewHours: metrics.avgFirstReviewHours,
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
  const bypass = isMetricsCacheBypassed(req);
  const days = Number(req.nextUrl.searchParams.get("days")) || 30;

  if (!accountId) {
    try {
      const result = await fetchCachedPRMetrics(session.accessToken, days, {
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
      accounts.map((account) =>
        fetchCachedPRMetrics(account.token, days, { bypass, userId: account.githubId })
      )
    );

    const merged = mergeMetrics(results, (a, b) => {
      const total = a.total + b.total;
      const mergedCount = a.merged + b.merged;
      const avgReviewHours =
        total > 0
          ? (a.avgReviewHours * a.total + b.avgReviewHours * b.total) / total
          : 0;
      const reviewedTotal =
        (a.avgFirstReviewHours === null ? 0 : a.total) +
        (b.avgFirstReviewHours === null ? 0 : b.total);
      const avgFirstReviewHours =
        reviewedTotal > 0
          ? ((a.avgFirstReviewHours ?? 0) * a.total +
              (b.avgFirstReviewHours ?? 0) * b.total) /
            reviewedTotal
          : null;

      return {
        open: a.open + b.open,
        merged: mergedCount,
        total,
        avgReviewHours: Math.round(avgReviewHours * 10) / 10,
        avgFirstReviewHours:
          avgFirstReviewHours === null
            ? null
            : Math.round(avgFirstReviewHours * 10) / 10,
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
    const result = await fetchCachedPRMetrics(token, days, {
      bypass,
      userId: accountId === session.githubId ? session.githubId : accountId,
    });
    return Response.json(formatPRMetrics(result));
  } catch {
    return Response.json({ error: "GitHub API error" }, { status: 502 });
  }
}
