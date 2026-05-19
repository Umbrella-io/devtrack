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

interface RepoSummary {
  name: string;
  commits: number;
}

interface RepoResponse {
  repos: RepoSummary[];
  days: number;
}

function mergeRepoCommits(
  a: Array<{ name: string; commits: number }>,
  b: Array<{ name: string; commits: number }>
): Array<{ name: string; commits: number }> {
  const map = new Map<string, number>();
  for (const repo of [...a, ...b]) {
    map.set(repo.name, (map.get(repo.name) ?? 0) + repo.commits);
  }
  return Array.from(map.entries())
    .map(([name, commits]) => ({ name, commits }))
    .sort((x, y) => y.commits - x.commits);
}

async function fetchReposForAccount(
  token: string,
  githubLogin: string,
  days: number,
  cacheContext: { bypass: boolean; userId: string }
): Promise<RepoResponse> {
  const key = metricsCacheKey(cacheContext.userId, "repos", {
    days,
    githubLogin,
  });

  return withMetricsCache(
    {
      bypass: cacheContext.bypass,
      key,
      ttlSeconds: METRICS_CACHE_TTL_SECONDS.repos,
    },
    async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);
      const sinceStr = since.toISOString().slice(0, 10);

      const searchRes = await fetch(
        `${GITHUB_API}/search/commits?q=author:${githubLogin}+author-date:>=${sinceStr}&per_page=100&sort=author-date&order=desc`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
          },
          cache: "no-store",
        }
      );

      if (!searchRes.ok) {
        throw new Error("GitHub API error");
      }

      const data = (await searchRes.json()) as {
        items: Array<{
          repository: { full_name: string; html_url: string };
          commit: { author: { date: string } };
        }>;
      };

      const repoMap: Record<string, number> = {};
      for (const item of data.items) {
        const name = item.repository.full_name;
        repoMap[name] = (repoMap[name] ?? 0) + 1;
      }

      const repos = Object.entries(repoMap)
        .map(([name, commits]) => ({ name, commits }))
        .sort((a, b) => b.commits - a.commits)
        .slice(0, 6);

      return { repos, days };
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
  const bypass = isMetricsCacheBypassed(req);

  if (!accountId) {
    try {
      const result = await fetchReposForAccount(
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
        fetchReposForAccount(account.token, account.githubLogin, days, {
          bypass,
          userId: account.githubId,
        })
      )
    );

    const merged = mergeMetrics(results, (a, b) => ({
      days: a.days,
      repos: mergeRepoCommits(a.repos, b.repos),
    }));

    if (!merged) {
      return Response.json({ error: "GitHub API error" }, { status: 502 });
    }

    return Response.json(merged);
  }

  if (accountId === session.githubId) {
    try {
      const result = await fetchReposForAccount(
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
    const result = await fetchReposForAccount(
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
