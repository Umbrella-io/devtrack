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
  description: string | null;
  url: string;
  languages?: RepoLanguage[];
}

interface RepoLanguage {
  name: string;
  bytes: number;
  percentage: number;
}

interface RepoResponse {
  repos: RepoSummary[];
  days: number;
}

function mergeRepoCommits(
  a: Array<RepoSummary>,
  b: Array<RepoSummary>
): Array<RepoSummary> {
  const map = new Map<string, { commits: number; description: string | null; url: string; languages?: RepoLanguage[] }>();
  for (const repo of [...a, ...b]) {
    const existing = map.get(repo.name);
    map.set(repo.name, {
      commits: (existing?.commits ?? 0) + repo.commits,
      description: existing?.description ?? repo.description,
      url: existing?.url ?? repo.url,
      languages: existing?.languages ?? repo.languages,
    });
  }
  return Array.from(map.entries())
    .map(([name, { commits, description, url, languages }]) => ({
      name,
      commits,
      description,
      url,
      languages,
    }))
    .sort((x, y) => y.commits - x.commits);
}

async function fetchRepoLanguages(
  token: string,
  repoName: string
): Promise<RepoLanguage[]> {
  const res = await fetch(`${GITHUB_API}/repos/${repoName}/languages`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    return [];
  }

  const langs = (await res.json()) as Record<string, number>;
  const totalBytes = Object.values(langs).reduce((sum, bytes) => sum + bytes, 0);

  if (totalBytes <= 0) {
    return [];
  }

  return Object.entries(langs)
    .map(([name, bytes]) => ({
      name,
      bytes,
      percentage: Math.round((bytes / totalBytes) * 1000) / 10,
    }))
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 6);
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
          repository: { full_name: string; html_url: string; description: string | null };
          commit: { author: { date: string } };
        }>;
      };

      const repoMap: Record<string, { commits: number; description: string | null; url: string }> = {};
      for (const item of data.items) {
        const name = item.repository.full_name;
        repoMap[name] = {
          commits: (repoMap[name]?.commits ?? 0) + 1,
          description: item.repository.description,
          url: item.repository.html_url,
        };
      }

      const repos = Object.entries(repoMap)
        .map(([name, { commits, description, url }]) => ({ name, commits, description, url }))
        .sort((a, b) => b.commits - a.commits)
        .slice(0, 6);

      const reposWithLanguages = await Promise.all(
        repos.map(async (repo) => {
          const languages = await fetchRepoLanguages(token, repo.name);
          return languages.length > 0 ? { ...repo, languages } : repo;
        })
      );

      return { repos: reposWithLanguages, days };
    }
  );
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken || !session.githubLogin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const daysParam = req.nextUrl.searchParams.get("days");
  const parsedDays = daysParam ? parseInt(daysParam, 10) : NaN;
  const days = isNaN(parsedDays) ? 30 : Math.max(1, Math.min(365, parsedDays));
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
