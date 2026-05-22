import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";
import {
  getAccountToken,
  getAllAccounts,
  mergeMetrics,
} from "@/lib/github-accounts";
import { GITHUB_API, GitHubCommitSearchItem, CommitItem } from "@/lib/github";
import {
  isMetricsCacheBypassed,
  METRICS_CACHE_TTL_SECONDS,
  metricsCacheKey,
  withMetricsCache,
} from "@/lib/metrics-cache";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveAppUser } from "@/lib/resolve-user";

export const dynamic = "force-dynamic";

interface ContributionResponse {
  days: number;
  total: number;
  data: Record<string, number>;
  commits: CommitItem[];
  sources?: {
    github: Record<string, number>;
    gitlab?: Record<string, number>;
  };
}

interface GitLabEvent {
  created_at: string;
  push_data?: {
    commit_count?: number;
  };
}

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function mergeContributionDays(
  a: Record<string, number>,
  b: Record<string, number>
): Record<string, number> {
  const result = { ...a };
  for (const [date, count] of Object.entries(b)) {
    result[date] = (result[date] ?? 0) + count;
  }
  return result;
}

function sumContributionDays(data: Record<string, number>): number {
  return Object.values(data).reduce((total, count) => total + count, 0);
}

async function fetchContributionsForAccount(
  token: string,
  githubLogin: string,
  days: number,
  cacheContext: { bypass: boolean; userId: string },
  fromDate?: string

): Promise<ContributionResponse> {
  const key = metricsCacheKey(cacheContext.userId, "contributions", {
    days,
    githubLogin,
  });

  return withMetricsCache(
    {
      bypass: cacheContext.bypass,
      key,
      ttlSeconds: METRICS_CACHE_TTL_SECONDS.contributions,
    },
    async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);
      const sinceStr = fromDate ?? toLocalDateStr(since);

      let allItems: Array<{
        sha: string;
        html_url: string;
        repository?: { full_name: string };
        commit: { author: { date: string }; message: string };
      }> = [];
      const commitItems: CommitItem[] = [];
      let totalCount = 0;
      let page = 1;

      // Note: this may issue up to 10 sequential GitHub Search API calls (max 1000 results).
      // Authenticated GitHub Search rate limits are low (~30 req/min). We handle 429/403
      // responses gracefully by returning partial results rather than failing the endpoint.
      while (page <= 10) {
        const searchRes = await fetch(
          `${GITHUB_API}/search/commits?q=author:${githubLogin}+author-date:>=${sinceStr}&per_page=100&page=${page}&sort=author-date&order=desc`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/vnd.github+json",
            },
            cache: "no-store",
          }
        );

        if (!searchRes.ok) {
          // If we're being rate limited or hit a secondary rate limit/permission error,
          // return partial results collected so far instead of failing the whole request.
          if (searchRes.status === 429 || searchRes.status === 403) {
            if (allItems.length === 0) {
              // If no items were retrieved at all, surface the error so callers know
              // the request could not be fulfilled.
              throw new Error(`GitHub API error: ${searchRes.status}`);
            }
            break;
          }

          throw new Error("GitHub API error");
        }

        const data = (await searchRes.json()) as {
          total_count: number;
          items: Array<{
            sha: string;
            html_url: string;
            repository?: { full_name: string };
            commit: { author: { date: string }; message: string };
          }>;
        };

        if (page === 1) {
          totalCount = data.total_count;
        }

        allItems = allItems.concat(data.items);

        if (data.items.length < 100) {
          break;
        }

        if (allItems.length >= 1000 || allItems.length >= totalCount) {
          break;
        }

        page += 1;
      }

      const commitsByDay: Record<string, number> = {};
      for (const item of allItems) {
        const date = item.commit.author.date.slice(0, 10);
        commitsByDay[date] = (commitsByDay[date] ?? 0) + 1;
        commitItems.push({
          sha: item.sha,
          message: item.commit.message.split("\n")[0],
          date,
          repo: item.repository?.full_name ?? "unknown",
          url: item.html_url,
        });
      }

      return { days, total: totalCount, data: commitsByDay, commits: commitItems };
    }
  );
}

async function fetchGitLabContributions(
  token: string,
  days: number,
  cacheContext: { bypass: boolean; userId: string }
): Promise<ContributionResponse> {
  const key = metricsCacheKey(cacheContext.userId, "contributions", {
    days,
    source: "gitlab",
  });

  return withMetricsCache(
    {
      bypass: cacheContext.bypass,
      key,
      ttlSeconds: METRICS_CACHE_TTL_SECONDS.contributions,
    },
    async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);
      since.setHours(0, 0, 0, 0);

      let page = 1;
      const commitsByDay: Record<string, number> = {};

      while (page > 0) {
        const url = new URL("https://gitlab.com/api/v4/events");
        url.searchParams.set("action", "pushed");
        url.searchParams.set("per_page", "100");
        url.searchParams.set("page", String(page));

        const response = await fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("GitLab API error");
        }

        const events = (await response.json()) as GitLabEvent[];
        if (events.length === 0) break;

        let reachedCutoff = false;
        for (const event of events) {
          const eventDate = new Date(event.created_at);
          if (eventDate < since) {
            reachedCutoff = true;
            break;
          }

          const count = event.push_data?.commit_count ?? 0;
          if (!count) continue;

          const dateKey = event.created_at.slice(0, 10);
          commitsByDay[dateKey] = (commitsByDay[dateKey] ?? 0) + count;
        }

        if (reachedCutoff) break;

        const nextPage = response.headers.get("x-next-page");
        if (!nextPage || nextPage === "0") break;
        const parsedNext = Number(nextPage);
        page = Number.isFinite(parsedNext) ? parsedNext : 0;
      }

      return {
        days,
        total: sumContributionDays(commitsByDay),
        data: commitsByDay,
        commits: [],
      };
    }
  );
}

async function mergeGitLabContributions(
  result: ContributionResponse,
  token: string,
  days: number,
  cacheContext: { bypass: boolean; userId: string }
): Promise<ContributionResponse> {
  const gitlabResult = await fetchGitLabContributions(
    token,
    days,
    cacheContext
  ).catch(() => null);

  if (!gitlabResult) {
    return result;
  }

  const combinedData = mergeContributionDays(result.data, gitlabResult.data);
  const combinedTotal = result.total + sumContributionDays(gitlabResult.data);

  return {
    days: result.days,
    total: combinedTotal,
    data: combinedData,
    commits: result.commits,
    sources: {
      github: result.data,
      gitlab: gitlabResult.data,
    },
  };
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken || !session.githubLogin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fromParam = req.nextUrl.searchParams.get("from");
  const toParam = req.nextUrl.searchParams.get("to");

  let days: number;
  let fromDate: string | undefined;

  if (fromParam && toParam) {
    fromDate = fromParam;
    const msPerDay = 1000 * 60 * 60 * 24;
    days = Math.ceil(
      (new Date(toParam).getTime() - new Date(fromParam).getTime()) / msPerDay
    ) + 1;
  } else {
    const daysParam = req.nextUrl.searchParams.get("days");
    const parsedDays = daysParam ? parseInt(daysParam, 10) : NaN;
    days = isNaN(parsedDays) ? 30 : Math.max(1, Math.min(365, parsedDays));
  }
  
  const accountId = req.nextUrl.searchParams.get("accountId");
  const username = req.nextUrl.searchParams.get("username")?.trim();
  const bypass = isMetricsCacheBypassed(req);
  const gitlabToken =
    typeof session.gitlabToken === "string" ? session.gitlabToken : undefined;

  // Compare mode path: explicitly fetch contributions for a target username.
  if (username) {
    try {
      const result = await fetchContributionsForAccount(
        session.accessToken,
        username,
        days,
        { bypass, userId: session.githubId ?? session.githubLogin },
        fromDate
      );
      return Response.json(result);
    } catch {
      return Response.json({ error: "GitHub API error" }, { status: 502 });
    }
  }

  if (!accountId) {
    try {
      const result = await fetchContributionsForAccount(
        session.accessToken,
        session.githubLogin,
        days,
        { bypass, userId: session.githubId ?? session.githubLogin },
        fromDate
      );

      if (!gitlabToken) {
        return Response.json(result);
      }

      const merged = await mergeGitLabContributions(result, gitlabToken, days, {
        bypass,
        userId: session.githubId ?? session.githubLogin,
      });

      return Response.json(merged);
    } catch {
      return Response.json({ error: "GitHub API error" }, { status: 502 });
    }
  }

  if (!session.githubId) {
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
        fetchContributionsForAccount(account.token, account.githubLogin, days, {
          bypass,
          userId: account.githubId,

        }, fromDate)
      )
    );

    const merged = mergeMetrics(results, (a, b) => ({
      days: a.days,
      total: a.total + b.total,
      data: mergeContributionDays(a.data, b.data),
      commits: [...a.commits, ...b.commits].sort(
        (c, d) => d.date.localeCompare(c.date) || d.sha.localeCompare(c.sha)
      ),
    }));

    if (!merged) {
      return Response.json({ error: "All accounts failed" }, { status: 502 });
    }

    if (!gitlabToken) {
      return Response.json(merged);
    }

    const combined = await mergeGitLabContributions(merged, gitlabToken, days, {
      bypass,
      userId: session.githubId,
    });

    return Response.json(combined);
  }

  if (accountId === session.githubId) {
    try {
      const result = await fetchContributionsForAccount(
        session.accessToken,
        session.githubLogin,
        days,
        { bypass, userId: session.githubId },
        fromDate
      );

      if (!gitlabToken) {
        return Response.json(result);
      }

      const merged = await mergeGitLabContributions(result, gitlabToken, days, {
        bypass,
        userId: session.githubId,
      });

      return Response.json(merged);
    } catch {
      return Response.json({ error: "GitHub API error" }, { status: 502 });
    }
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

  try {
    const result = await fetchContributionsForAccount(
      accountToken,
      accountRow.github_login,
      days,
      { bypass, userId: accountId },
      fromDate
    );
    return Response.json(result);
  } catch {
    return Response.json({ error: "GitHub API error" }, { status: 502 });
  }
}
