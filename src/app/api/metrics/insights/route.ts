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
import {
  buildDeveloperPersonaResponse,
  mergeSignals,
  type DeveloperSignals,
} from "@/lib/developer-persona";

export const dynamic = "force-dynamic";

interface CommitSearchItem {
  sha: string;
  commit: {
    author: { date: string };
  };
  repository: {
    full_name: string;
  };
}

interface PullRequestSearchItem {
  created_at: string;
  pull_request?: { merged_at: string | null };
}

interface CommitDetailsResponse {
  stats?: {
    additions?: number;
    deletions?: number;
  };
}

function emptySignals(): DeveloperSignals {
  return {
    commitCountsByDate: {},
    timeBlocks: {
      morning: 0,
      afternoon: 0,
      evening: 0,
      night: 0,
    },
    prsOpened: 0,
    prsMerged: 0,
    prMergeTotalHours: 0,
    prMergeSampleSize: 0,
    additions: 0,
    deletions: 0,
  };
}

async function fetchAccountSignals(
  token: string,
  githubLogin: string,
  cacheContext: { bypass: boolean; userId: string }
): Promise<DeveloperSignals> {
  const key = metricsCacheKey(cacheContext.userId, "insights", {
    githubLogin,
  });

  return withMetricsCache(
    {
      bypass: cacheContext.bypass,
      key,
      ttlSeconds: METRICS_CACHE_TTL_SECONDS.prs,
    },
    async () => {
      const since90 = new Date();
      since90.setDate(since90.getDate() - 90);
      const since90Str = since90.toISOString().slice(0, 10);

      const commitsRes = await fetch(
        `${GITHUB_API}/search/commits?q=author:${githubLogin}+author-date:>=${since90Str}&per_page=100&sort=author-date&order=desc`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
          },
          cache: "no-store",
        }
      );

      if (!commitsRes.ok) {
        throw new Error("GitHub API error");
      }

      const commitsData = (await commitsRes.json()) as {
        items: CommitSearchItem[];
      };

      const signals = emptySignals();
      const recentCommitRefs: Array<{ repo: string; sha: string }> = [];

      for (const item of commitsData.items ?? []) {
        const commitDate = new Date(item.commit.author.date);

        if (Number.isNaN(commitDate.getTime())) {
          continue;
        }

        const dateKey = item.commit.author.date.slice(0, 10);
        signals.commitCountsByDate[dateKey] =
          (signals.commitCountsByDate[dateKey] ?? 0) + 1;

        const hour = commitDate.getUTCHours();
        if (hour >= 5 && hour < 10) {
          signals.timeBlocks.morning += 1;
        } else if (hour >= 10 && hour < 18) {
          signals.timeBlocks.afternoon += 1;
        } else if (hour >= 18 && hour < 22) {
          signals.timeBlocks.evening += 1;
        } else {
          signals.timeBlocks.night += 1;
        }

        if (recentCommitRefs.length < 10) {
          recentCommitRefs.push({
            repo: item.repository.full_name,
            sha: item.sha,
          });
        }
      }

      const recentCommitDetails = await Promise.all(
        recentCommitRefs.map(async (commitRef) => {
          const response = await fetch(
            `${GITHUB_API}/repos/${commitRef.repo}/commits/${commitRef.sha}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github+json",
              },
              cache: "no-store",
            }
          );

          if (!response.ok) {
            return null;
          }

          return (await response.json()) as CommitDetailsResponse;
        })
      );

      for (const commitDetails of recentCommitDetails) {
        if (!commitDetails?.stats) {
          continue;
        }

        signals.additions += commitDetails.stats.additions ?? 0;
        signals.deletions += commitDetails.stats.deletions ?? 0;
      }

      const prsRes = await fetch(
        `${GITHUB_API}/search/issues?q=type:pr+author:@me+created:>=${since90Str}&per_page=100`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
          },
          cache: "no-store",
        }
      );

      if (!prsRes.ok) {
        throw new Error("GitHub API error");
      }

      const prsData = (await prsRes.json()) as {
        items: PullRequestSearchItem[];
      };

      for (const item of prsData.items ?? []) {
        const createdAt = new Date(item.created_at);

        if (Number.isNaN(createdAt.getTime())) {
          continue;
        }

        signals.prsOpened += 1;

        if (item.pull_request?.merged_at) {
          const mergedAt = new Date(item.pull_request.merged_at);

          if (!Number.isNaN(mergedAt.getTime()) && mergedAt >= createdAt) {
            signals.prsMerged += 1;
            signals.prMergeTotalHours +=
              (mergedAt.getTime() - createdAt.getTime()) / 3600000;
            signals.prMergeSampleSize += 1;
          }
        }
      }

      return signals;
    }
  );
}

function mergeAccountResults(results: PromiseSettledResult<DeveloperSignals>[]) {
  return mergeMetrics(results, mergeSignals);
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken || !session.githubLogin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accountId = req.nextUrl.searchParams.get("accountId");
  const bypass = isMetricsCacheBypassed(req);

  if (!accountId) {
    try {
      const result = await fetchAccountSignals(session.accessToken, session.githubLogin, {
        bypass,
        userId: session.githubId ?? session.githubLogin,
      });

      return Response.json(buildDeveloperPersonaResponse(result));
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
        fetchAccountSignals(account.token, account.githubLogin, {
          bypass,
          userId: account.githubId,
        })
      )
    );

    const merged = mergeAccountResults(results);

    if (!merged) {
      return Response.json({ error: "GitHub API error" }, { status: 502 });
    }

    return Response.json(buildDeveloperPersonaResponse(merged));
  }

  if (accountId === session.githubId) {
    try {
      const result = await fetchAccountSignals(session.accessToken, session.githubLogin, {
        bypass,
        userId: session.githubId,
      });

      return Response.json(buildDeveloperPersonaResponse(result));
    } catch {
      return Response.json({ error: "GitHub API error" }, { status: 502 });
    }
  }

  const token = await getAccountToken(userRow.id, accountId);

  if (!token) {
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
    const result = await fetchAccountSignals(token, accountRow.github_login, {
      bypass,
      userId: accountId,
    });

    return Response.json(buildDeveloperPersonaResponse(result));
  } catch {
    return Response.json({ error: "GitHub API error" }, { status: 502 });
  }
}


