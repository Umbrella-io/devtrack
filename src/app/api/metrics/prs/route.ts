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
interface ReviewMetrics {
  totalReviews: number;
  approvalRate: string;
  avgFirstReviewHours: number | null;
  topRepos: { repo: string; count: number }[];
}
interface PRMetricsBase {
  open: number;
  merged: number;
  closed: number;
  total: number;
  avgReviewHours: number;
  avgFirstReviewHours: number | null;
  mergeRate: number;
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

async function fetchPRMetrics(token: string): Promise<PRMetricsBase> {
  const searchRes = await fetch(
    `${GITHUB_API}/search/issues?q=type:pr+author:@me&sort=updated&order=desc&per_page=100`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }
  );

  if (!searchRes.ok) {
    throw new Error("GitHub API error");
  }

  const data = (await searchRes.json()) as {
    total_count: number;
    items: PullRequestSearchItem[];
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
          0
        ) / mergedPRs.length
      : 0;

  // Use the number of fetched items as the denominator for mergeRate.
  // data.total_count is the all-time GitHub total (potentially thousands)
  // while data.items is capped at 100, so dividing merged/total_count
  // produces a near-zero rate for any active user. The fetched sample
  // (open + merged + closed-without-merge) is the correct base.
  const sampleTotal = data.items.length;
  const avgFirstReviewHours = await getAverageFirstReviewHours(
    token,
    data.items
  );

  return {
    open,
    merged,
    closed,
    total: data.total_count,
    avgReviewHours: Math.round(avgReviewMs / 3600000),
    avgFirstReviewHours,
    mergeRate: sampleTotal > 0 ? merged / sampleTotal : 0,
  };
}

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
    avgFirstReviewHours: metrics.avgFirstReviewHours,
    mergeRate:
      metrics.total > 0
        ? `${Math.round(metrics.mergeRate * 100)}%`
        : "0%",
  };
}
async function fetchReviewMetrics(token: string): Promise<ReviewMetrics> {
  const query = `
    query {
      viewer {
        contributionsCollection {
          pullRequestReviewContributions(first: 100) {
            nodes {
              occurredAt
              pullRequestReview {
                state
                pullRequest {
                  repository {
                    nameWithOwner
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
    cache: "no-store",
  });

  if (!res.ok) throw new Error("GitHub GraphQL error");

  const json = await res.json();
  const nodes =
    json?.data?.viewer?.contributionsCollection
      ?.pullRequestReviewContributions?.nodes ?? [];

  const totalReviews = nodes.length;

  const approvals = nodes.filter(
    (n: { pullRequestReview: { state: string } }) =>
      n.pullRequestReview?.state === "APPROVED"
  ).length;

  const approvalRate =
    totalReviews > 0
      ? `${Math.round((approvals / totalReviews) * 100)}%`
      : "0%";

  // Count reviews per repo
  const repoCounts: Record<string, number> = {};
  for (const node of nodes) {
    const repo = node.pullRequestReview?.pullRequest?.repository?.nameWithOwner;
    if (repo) repoCounts[repo] = (repoCounts[repo] ?? 0) + 1;
  }

  const topRepos = Object.entries(repoCounts)
    .map(([repo, count]) => ({ repo, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalReviews,
    approvalRate,
    avgFirstReviewHours: null,
    topRepos,
  };
}
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accountId = req.nextUrl.searchParams.get("accountId");
  const bypass = isMetricsCacheBypassed(req);

  if (!accountId) {
    try {
      const [prResult, reviewResult] = await Promise.all([
        fetchCachedPRMetrics(session.accessToken, {
          bypass,
          userId: session.githubId ?? session.githubLogin ?? "primary",
        }),
        fetchReviewMetrics(session.accessToken),
      ]);
      return Response.json({
        ...formatPRMetrics(prResult),
        reviews: reviewResult,
      });
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
      userRow.id
    );

    const results = await Promise.allSettled(
      accounts.map((account) =>
        fetchCachedPRMetrics(account.token, { bypass, userId: account.githubId })
      )
    );

    const reviewResults = await Promise.allSettled(
      accounts.map((account) => fetchReviewMetrics(account.token))
    );

    const merged = mergeMetrics(results, (a, b) => {
      const total = a.total + b.total;
      const mergedCount = a.merged + b.merged;
      const closedCount = a.closed + b.closed;
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
        closed: closedCount,
        total,
        avgReviewHours: Math.round(avgReviewHours * 10) / 10,
        avgFirstReviewHours:
          avgFirstReviewHours === null
            ? null
            : Math.round(avgFirstReviewHours * 10) / 10,
        mergeRate:
          total > 0 ? Math.round((mergedCount / total) * 100) / 100 : 0,
      };
    });

    if (!merged) {
      return Response.json({ error: "GitHub API error" }, { status: 502 });
    }

    // Merge review results across accounts
    const allReviewNodes = reviewResults
      .filter((r) => r.status === "fulfilled")
      .map((r) => (r as PromiseFulfilledResult<ReviewMetrics>).value);

    const mergedReviews: ReviewMetrics =
      allReviewNodes.length > 0
        ? {
            totalReviews: allReviewNodes.reduce(
              (sum, r) => sum + r.totalReviews,
              0
            ),
            approvalRate: (() => {
              const total = allReviewNodes.reduce(
                (sum, r) => sum + r.totalReviews,
                0
              );
              const approvals = allReviewNodes.reduce((sum, r) => {
                const rate = parseInt(r.approvalRate) / 100;
                return sum + Math.round(rate * r.totalReviews);
              }, 0);
              return total > 0
                ? `${Math.round((approvals / total) * 100)}%`
                : "0%";
            })(),
            avgFirstReviewHours: null,
            topRepos: Object.entries(
              allReviewNodes
                .flatMap((r) => r.topRepos)
                .reduce(
                  (acc, { repo, count }) => {
                    acc[repo] = (acc[repo] ?? 0) + count;
                    return acc;
                  },
                  {} as Record<string, number>
                )
            )
              .map(([repo, count]) => ({ repo, count }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 5),
          }
        : {
            totalReviews: 0,
            approvalRate: "0%",
            avgFirstReviewHours: null,
            topRepos: [],
          };

    return Response.json({
      ...formatPRMetrics(merged),
      reviews: mergedReviews,
    });
  }

  const token =
    accountId === session.githubId
      ? session.accessToken
      : await getAccountToken(userRow.id, accountId);

  if (!token) {
    return Response.json({ error: "Account not found" }, { status: 404 });
  }

  try {
    const [result, reviewResult] = await Promise.all([
      fetchCachedPRMetrics(token, {
        bypass,
        userId: accountId === session.githubId ? session.githubId : accountId,
      }),
      fetchReviewMetrics(token),
    ]);
    return Response.json({
      ...formatPRMetrics(result),
      reviews: reviewResult,
    });
  } catch {
    return Response.json({ error: "GitHub API error" }, { status: 502 });
  }
}
