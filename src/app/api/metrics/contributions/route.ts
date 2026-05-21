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
import { GitHubApiError, toGitHubErrorResponse } from "@/lib/github-error";

export const dynamic = "force-dynamic";

interface ContributionResponse {
  days: number;
  total: number;
  data: Record<string, number>;
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

async function fetchContributionsForAccount(
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

      const endpoint = `${GITHUB_API}/search/commits?q=author:${githubLogin}+author-date:>=${sinceStr}&per_page=100&sort=author-date&order=desc`;
      const searchRes = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
        },
        cache: "no-store",
      });

      if (!searchRes.ok) {
        const body = await searchRes.text();
        console.error("GitHub API failed", {
          endpoint,
          status: searchRes.status,
          body,
        });
        throw new GitHubApiError(endpoint, searchRes.status, body);
      }

      const data = (await searchRes.json()) as {
        total_count: number;
        items: Array<{ commit: { author: { date: string } } }>;
      };

      const commitsByDay: Record<string, number> = {};
      for (const item of data.items) {
        const date = item.commit.author.date.slice(0, 10);
        commitsByDay[date] = (commitsByDay[date] ?? 0) + 1;
      }

      return { days, total: data.total_count, data: commitsByDay };
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
  const username = req.nextUrl.searchParams.get("username")?.trim();
  const bypass = isMetricsCacheBypassed(req);

  // Compare mode path: explicitly fetch contributions for a target username.
  if (username) {
    try {
      const result = await fetchContributionsForAccount(
        session.accessToken,
        username,
        days,
        { bypass, userId: session.githubId ?? session.githubLogin }
      );
      return Response.json(result);
    } catch (error) {
      return toGitHubErrorResponse(error);
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
    } catch (error) {
      return toGitHubErrorResponse(error);
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
    try {
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
      }));

      if (!merged) {
        return Response.json({ error: "All accounts failed" }, { status: 502 });
      }

      return Response.json(merged);
    } catch (error) {
      console.error("Failed to fetch combined contributions:", error);
      return Response.json({ error: "Failed to fetch accounts" }, { status: 500 });
    }
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
    } catch (error) {
      return toGitHubErrorResponse(error);
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
    .maybeSingle();

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
  } catch (error) {
    return toGitHubErrorResponse(error);
  }
}