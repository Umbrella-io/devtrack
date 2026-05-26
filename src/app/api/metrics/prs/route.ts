import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";
import {
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

const STALE_THRESHOLD_OPTIONS = [7, 14, 30] as const;
const DEFAULT_STALE_THRESHOLD_DAYS = 7;

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
  staleCount: number;
  staleThresholdDays: number;
  staleSearchUrl: string | null;
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

interface GitLabMergeRequestItem {
  state: string;
  created_at: string;
  merged_at?: string | null;
  closed_at?: string | null;
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

function getStaleThresholdDays(req: NextRequest): number {
  const requestedThreshold = Number(
    req.nextUrl.searchParams.get("staleThresholdDays") ??
      DEFAULT_STALE_THRESHOLD_DAYS
  );

  return STALE_THRESHOLD_OPTIONS.includes(
    requestedThreshold as (typeof STALE_THRESHOLD_OPTIONS)[number]
  )
    ? requestedThreshold
    : DEFAULT_STALE_THRESHOLD_DAYS;
}

function getStaleSearchUrl(
  githubLogin: string | null | undefined,
  staleCutoffMs: number
): string | null {
  if (!githubLogin) {
    return null;
  }

  const cutoffDate = new Date(staleCutoffMs).toISOString().slice(0, 10);
  const params = new URLSearchParams({
    q: `is:pr is:open author:${githubLogin} created:<${cutoffDate}`,
  });

  return `https://github.com/pulls?${params.toString()}`;
}

async function fetchFirstReviewTimestamp(
  token: string,
  pr: PullRequestSearchItem
): Promise<number | null> {
  const repo = getRepoFullName(pr.repository_url);

  if (!repo) {
    return null;
  }

  // GitHub REST API — fetches reviews and inline comments for a single PR.
  // Rate limit: 5,000 requests/hour (authenticated with OAuth token / PAT).
  // This is called for up to 30 PRs in getAverageFirstReviewHours, so it can
  // consume up to 60 requests per dashboard load (2 endpoints × 30 PRs).
  // The withMetricsCache wrapper in fetchCachedPRMetrics prevents re-fetching
  // within the TTL window, keeping total usage low across page loads.
  const headers = {
    // OAuth token / PAT: required to stay in the 5,000 req/hr authenticated tier.
    // Without a token, GitHub allows only 60 req/hr per IP — easily exhausted here.
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

  // Silently return null on failure (rate limit, private repo access denied, etc.)
  // rather than throwing — first-review time is a supplementary metric and should
  // not break the entire PR widget if these secondary calls fail.
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
  // Capped at 30 PRs to limit API usage: each PR costs 2 requests (reviews + comments).
  // 30 PRs × 2 = 60 requests, well within the 5,000/hr authenticated REST API limit.
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
  options: { staleThresholdDays: number; githubLogin?: string | null }
): Promise<PRMetricsBase> {
  // GitHub Search API rate limits (separate quota from the REST API):
  //   • Authenticated (OAuth token / PAT): 30 requests/minute
  //   • Unauthenticated:                   10 requests/minute
  //
  // This is a per-MINUTE limit — much stricter than the 5,000/hr REST limit.
  // Concurrent widget loads (prs + streak + repos all fetching at once) can
  // exhaust it quickly. The withMetricsCache wrapper in fetchCachedPRMetrics
  // protects against this by reusing results within the cache TTL window.
  const searchRes = await fetch(
    `${GITHUB_API}/search/issues?q=type:pr+author:@me&sort=updated&order=desc&per_page=100`,
    {
      headers: {
        // OAuth token / PAT: raises the Search API limit from 10 → 30 req/min.
        // Contributors: set GITHUB_TOKEN in .env.local to use a PAT if you hit
        // rate limits during local development (bypasses the cache layer).
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }
  );

  // HTTP 403 = Search API rate limit exceeded for this token ("API rate limit exceeded").
  // HTTP 422 = malformed search query (e.g. invalid filter syntax).
  // Both are thrown here and caught by the GET handler, which returns HTTP 502
  // so the client can display an error state rather than stale/empty data.
  if (!searchRes.ok) {
    throw new Error("GitHub API error");
  }

  const data = (await searchRes.json()) as {
    total_count: number;
    items: PullRequestSearchItem[];
  };

  const open = data.items.filter((pr) => pr.state === "open").length;
  const staleCutoffMs =
    Date.now() - options.staleThresholdDays * 24 * 60 * 60 * 1000;
  const staleCount = data.items.filter((pr) => {
    if (pr.state !== "open") {
      return false;
    }

    const createdAt = new Date(pr.created_at).getTime();
    return !Number.isNaN(createdAt) && createdAt < staleCutoffMs;
  }).length;

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
    staleCount,
    staleThresholdDays: options.staleThresholdDays,
    staleSearchUrl: getStaleSearchUrl(options.githubLogin, staleCutoffMs),
  };
}

async function fetchGitLabMRMetrics(token: string): Promise<PRMetricsBase> {
  const perPage = 100;
  let page = 1;
  let totalPages: number | null = null;
  let totalCount: number | null = null;
  const items: GitLabMergeRequestItem[] = [];

  // GitLab REST API — paginated fetch of all merge requests created by the user.
  // GitLab rate limits differ from GitHub:
  //   • Authenticated: 2,000 requests/minute (much more generous than GitHub Search)
  //   • Unauthenticated: 500 requests/minute
  // Pagination is driven by the x-next-page / x-total-pages response headers
  // rather than GitHub's Link header style.
  while (page > 0) {
    const url = new URL("https://gitlab.com/api/v4/merge_requests");
    url.searchParams.set("scope", "created_by_me");
    url.searchParams.set("state", "all");
    url.searchParams.set("per_page", String(perPage));
    url.searchParams.set("page", String(page));

    const response = await fetch(url.toString(), {
      headers: {
        // GitLab personal access token or OAuth token passed as Bearer.
        // Stored separately from the GitHub token in session.gitlabToken.
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("GitLab API error");
    }

    if (totalCount === null) {
      const totalHeader = response.headers.get("x-total");
      const parsedTotal = totalHeader ? Number(totalHeader) : NaN;
      if (Number.isFinite(parsedTotal)) {
        totalCount = parsedTotal;
      }
    }

    if (totalPages === null) {
      const totalPagesHeader = response.headers.get("x-total-pages");
      const parsedPages = totalPagesHeader ? Number(totalPagesHeader) : NaN;
      if (Number.isFinite(parsedPages) && parsedPages > 0) {
        totalPages = parsedPages;
      }
    }

    const pageItems = (await response.json()) as GitLabMergeRequestItem[];
    if (!Array.isArray(pageItems) || pageItems.length === 0) {
      break;
    }

    items.push(...pageItems);

    const nextPage = response.headers.get("x-next-page");
    const parsedNext = nextPage && nextPage !== "0" ? Number(nextPage) : NaN;
    if (Number.isFinite(parsedNext)) {
      page = parsedNext;
      continue;
    }

    if (totalPages !== null && page < totalPages) {
      page += 1;
      continue;
    }

    if (pageItems.length === perPage) {
      page += 1;
      continue;
    }

    break;
  }

  const open = items.filter((mr) => mr.state === "opened").length;
  const mergedItems = items.filter(
    (mr) => mr.state === "merged" && mr.merged_at
  );
  const merged = mergedItems.length;
  const closed = items.filter((mr) => mr.state === "closed").length;

  const reviewDurations = mergedItems
    .map((mr) => {
      const created = new Date(mr.created_at).getTime();
      const mergedAt = new Date(mr.merged_at!).getTime();
      if (Number.isNaN(created) || Number.isNaN(mergedAt)) {
        return null;
      }
      return mergedAt - created;
    })
    .filter((value): value is number => typeof value === "number");

  const avgReviewMs =
    reviewDurations.length > 0
      ? reviewDurations.reduce((sum, value) => sum + value, 0) /
        reviewDurations.length
      : 0;

  const sampleTotal = items.length;

  return {
    open,
    merged,
    closed,
    total: totalCount ?? sampleTotal,
    avgReviewHours: Math.round(avgReviewMs / 3600000),
    avgFirstReviewHours: null,
    mergeRate: sampleTotal > 0 ? merged / sampleTotal : 0,
    staleCount: 0,
    staleThresholdDays: DEFAULT_STALE_THRESHOLD_DAYS,
    staleSearchUrl: null,
  };
}

async function fetchCachedPRMetrics(
  token: string,
  cacheContext: {
    bypass: boolean;
    githubLogin?: string | null;
    staleThresholdDays: number;
    userId: string;
  }
): Promise<PRMetricsBase> {
  // Cache key is scoped per user + staleThresholdDays so different threshold
  // settings don't return each other's cached results.
  const key = metricsCacheKey(cacheContext.userId, "prs", {
    staleThresholdDays: cacheContext.staleThresholdDays,
  });

  // withMetricsCache checks for a cached result first.
  // If found and not bypassed, the GitHub Search API is never called —
  // this is the primary defence against hitting the 30 req/min rate limit.
  return withMetricsCache(
    {
      bypass: cacheContext.bypass,
      key,
      ttlSeconds: METRICS_CACHE_TTL_SECONDS.prs,
    },
    () =>
      fetchPRMetrics(token, {
        githubLogin: cacheContext.githubLogin,
        staleThresholdDays: cacheContext.staleThresholdDays,
      })
  );
}

async function fetchCachedGitLabMRMetrics(
  token: string,
  cacheContext: { bypass: boolean; userId: string }
): Promise<PRMetricsBase> {
  const key = metricsCacheKey(cacheContext.userId, "prs", {
    source: "gitlab",
  });

  return withMetricsCache(
    {
      bypass: cacheContext.bypass,
      key,
      ttlSeconds: METRICS_CACHE_TTL_SECONDS.prs,
    },
    () => fetchGitLabMRMetrics(token)
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
    staleCount: metrics.staleCount,
    staleThresholdDays: metrics.staleThresholdDays,
    staleSearchUrl: metrics.staleSearchUrl,
    mergeRate:
      metrics.total > 0
        ? `${Math.round(metrics.mergeRate * 100)}%`
        : "0%",
  };
}

function formatPRMetricsResponse(
  metrics: PRMetricsBase,
  gitlab: PRMetricsBase | null
) {
  return {
    ...formatPRMetrics(metrics),
    ...(gitlab ? { gitlab: formatPRMetrics(gitlab) } : {}),
  };
}

async function getGitLabMetrics(
  token: string | undefined,
  cacheContext: { bypass: boolean; userId: string }
) {
  if (!token) {
    return null;
  }

  try {
    return await fetchCachedGitLabMRMetrics(token, cacheContext);
  } catch {
    return null;
  }
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

  // GitHub GraphQL API rate limits:
  //   • Authenticated (OAuth token / PAT): 5,000 points/hour
  //   • Unauthenticated:                   not supported — always requires a token
  // GraphQL uses a "points" system where complex/nested queries cost more points.
  // This query fetches up to 100 review contributions — a low-cost operation (~1 point).
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      // Token is REQUIRED — GitHub rejects all unauthenticated GraphQL requests with 401.
      // A PAT with `read:user` scope works as a drop-in for the OAuth token.
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
    cache: "no-store",
  });

  // HTTP 403 = rate limit exceeded (5,000 points/hr exhausted).
  // Note: GraphQL can also return HTTP 200 with an "errors" array for partial
  // failures — not checked here since missing review data is non-critical and
  // the .catch(() => null) in the GET handler silently swallows this error.
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

  const gitlabToken =
    typeof session.gitlabToken === "string" ? session.gitlabToken : undefined;

  const accountId = req.nextUrl.searchParams.get("accountId");
  const bypass = isMetricsCacheBypassed(req);
  const staleThresholdDays = getStaleThresholdDays(req);
  const gitlabCacheContext = {
    bypass,
    userId: session.githubId ?? session.githubLogin ?? "primary",
  };

  if (!accountId) {
    try {
      const result = await fetchCachedPRMetrics(session.accessToken, {
        bypass,
        githubLogin: session.githubLogin,
        staleThresholdDays,
        userId: session.githubId ?? session.githubLogin ?? "primary",
      });
      const [gitlab, reviews] = await Promise.all([
        getGitLabMetrics(gitlabToken, gitlabCacheContext),
        // fetchReviewMetrics uses the GraphQL API (5,000 pts/hr limit).
        // .catch(() => null) ensures a GraphQL rate limit error doesn't
        // fail the entire PR metrics response — reviews are supplementary.
        fetchReviewMetrics(session.accessToken).catch(() => null),
      ]);
      return Response.json({ ...formatPRMetricsResponse(result, gitlab), reviews });
    } catch {
      // Catches errors from fetchCachedPRMetrics (GitHub Search API failures).
      // Returns 502 so the client knows the data is unavailable, not just empty.
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

    // Each account makes its own Search API call — N accounts = N requests
    // against the 30 req/min Search API limit. Promise.allSettled is used so
    // one account failing (e.g. expired token) doesn't block the others.
    const results = await Promise.allSettled(
      accounts.map((account) =>
        fetchCachedPRMetrics(account.token, {
          bypass,
          githubLogin: account.githubLogin,
          staleThresholdDays,
          userId: account.githubId,
        })
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
        staleCount: a.staleCount + b.staleCount,
        staleThresholdDays,
        staleSearchUrl: null,
        mergeRate:
          total > 0 ? Math.round((mergedCount / total) * 100) / 100 : 0,
      };
    });

    if (!merged) {
      return Response.json({ error: "GitHub API error" }, { status: 502 });
    }
    const [gitlab, reviews] = await Promise.all([
      getGitLabMetrics(gitlabToken, gitlabCacheContext),
      fetchReviewMetrics(session.accessToken).catch(() => null),
    ]);
    return Response.json({ ...formatPRMetricsResponse(merged, gitlab), reviews });
  }

  const accounts = await getAllAccounts(
    {
      token: session.accessToken,
      githubId: session.githubId,
      githubLogin: session.githubLogin,
    },
    userRow.id
  );
  const selectedAccount = accounts.find(
    (account) => account.githubId === accountId
  );

  if (!selectedAccount) {
    return Response.json({ error: "Account not found" }, { status: 404 });
  }

  try {
    const result = await fetchCachedPRMetrics(selectedAccount.token, {
      bypass,
      githubLogin: selectedAccount.githubLogin,
      staleThresholdDays,
      userId: selectedAccount.githubId,
    });
    const [gitlab, reviews] = await Promise.all([
      getGitLabMetrics(gitlabToken, gitlabCacheContext),
      fetchReviewMetrics(selectedAccount.token).catch(() => null),
    ]);
    return Response.json({ ...formatPRMetricsResponse(result, gitlab), reviews });
  } catch {
    return Response.json({ error: "GitHub API error" }, { status: 502 });
  }
}