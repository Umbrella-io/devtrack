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
import { normalizeGitHubUsername } from "@/lib/validate-github-username";

export const dynamic = "force-dynamic";

interface CommitItem {
  sha: string;
  message: string;
  date: string;
  repo: string;
  url: string;
}

interface GitHubCommitSearchItem {
  sha: string;
  html_url: string;
  repository?: { full_name: string };
  commit: {
    author: { date: string };
    message: string;
  };
}

interface ContributionResponse {
  days: number;
  total: number;
  data: Record<string, number>;
  commits?: CommitItem[];
}

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
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

export async function fetchContributionsForAccount(
  token: string,
  githubLogin: string,
  days: number,
  cacheContext: { bypass: boolean; userId: string }
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
      const sinceStr = toLocalDateStr(since);

      let allItems: GitHubCommitSearchItem[] = [];
      const commitItems: CommitItem[] = [];
      let totalCount = 0;
      let page = 1;

      while (page <= 10) {
        const searchUrl = new URL(`${GITHUB_API}/search/commits`);

        searchUrl.searchParams.set(
          "q",
          `author:${githubLogin} author-date:>=${sinceStr}`
        );
        searchUrl.searchParams.set("per_page", "100");
        searchUrl.searchParams.set("page", String(page));
        searchUrl.searchParams.set("sort", "author-date");
        searchUrl.searchParams.set("order", "desc");

        const searchRes = await fetch(searchUrl.toString(), {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
          },
          cache: "no-store",
        });

        if (!searchRes.ok) {
          if (searchRes.status === 429 || searchRes.status === 403) {
            if (allItems.length === 0) {
              throw new Error(`GitHub API error: ${searchRes.status}`);
            }

            break;
          }

          throw new Error("GitHub API error");
        }

        const data = (await searchRes.json()) as {
          total_count: number;
          items: GitHubCommitSearchItem[];
        };

        if (page === 1) {
          totalCount = data.total_count;
        }

        allItems = allItems.concat(data.items);

        if (
          data.items.length < 100 ||
          allItems.length >= 1000 ||
          allItems.length >= totalCount
        ) {
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

      return {
        days,
        total: totalCount,
        data: commitsByDay,
        commits: commitItems,
      };
    }
  );
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken || !session.githubLogin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const days = Number(req.nextUrl.searchParams.get("days")) || 30;
  const accountId = req.nextUrl.searchParams.get("accountId");
  const usernameParam = req.nextUrl.searchParams.get("username");
  const username = usernameParam ? normalizeGitHubUsername(usernameParam) : null;
  const bypass = isMetricsCacheBypassed(req);

  if (usernameParam && !username) {
    return Response.json({ error: "Invalid GitHub username" }, { status: 400 });
  }

  if (username) {
    try {
      const result = await fetchContributionsForAccount(
        session.accessToken,
        username,
        days,
        { bypass, userId: session.githubId ?? session.githubLogin }
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
        { bypass, userId: session.githubId ?? session.githubLogin }
      );

      return Response.json(result);
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
        })
      )
    );

    const merged = mergeMetrics(results, (a, b) => ({
      days: a.days,
      total: a.total + b.total,
      data: mergeContributionDays(a.data, b.data),
      commits: [...(a.commits ?? []), ...(b.commits ?? [])],
    }));

    if (!merged) {
      return Response.json({ error: "All accounts failed" }, { status: 502 });
    }

    return Response.json(merged);
  }

  if (accountId === session.githubId) {
    try {
      const result = await fetchContributionsForAccount(
        session.accessToken,
        session.githubLogin,
        days,
        { bypass, userId: session.githubId }
      );

      return Response.json(result);
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
      { bypass, userId: accountId }
    );

    return Response.json(result);
  } catch {
    return Response.json({ error: "GitHub API error" }, { status: 502 });
  }
}