import { GITHUB_API, fetchIssuesMetrics } from "@/lib/github";
import {
  METRICS_CACHE_TTL_SECONDS,
  metricsCacheKey,
  withMetricsCache,
} from "@/lib/metrics-cache";

interface CacheContext {
  bypass: boolean;
  userId: string;
}

interface RepoResponse {
  repos: Array<{ name: string; commits: number }>;
  days: number;
}

interface ContributionResponse {
  days: number;
  total: number;
  data: Record<string, number>;
}

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function dateDiffDays(a: string, b: string): number {
  return (
    (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24)
  );
}

export async function fetchReposForChatbot(
  token: string,
  githubLogin: string,
  days: number,
  cacheContext: CacheContext
): Promise<RepoResponse | null> {
  try {
    const key = metricsCacheKey(cacheContext.userId, "repos", {
      days,
      githubLogin,
    });

    return await withMetricsCache(
      {
        bypass: cacheContext.bypass,
        key,
        ttlSeconds: METRICS_CACHE_TTL_SECONDS.repos,
      },
      async () => {
        const since = new Date();
        since.setDate(since.getDate() - days);
        const sinceStr = toDateStr(since);

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

        if (!searchRes.ok) return null;

        const data = (await searchRes.json()) as {
          items: Array<{ repository: { full_name: string } }>;
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
  } catch {
    return null;
  }
}

export async function fetchContributionsForChatbot(
  token: string,
  githubLogin: string,
  days: number,
  cacheContext: CacheContext
): Promise<ContributionResponse | null> {
  try {
    const key = metricsCacheKey(cacheContext.userId, "contributions", {
      days,
      githubLogin,
    });

    return await withMetricsCache(
      {
        bypass: cacheContext.bypass,
        key,
        ttlSeconds: METRICS_CACHE_TTL_SECONDS.contributions,
      },
      async () => {
        const since = new Date();
        since.setDate(since.getDate() - days);
        const sinceStr = toDateStr(since);

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

        if (!searchRes.ok) return null;

        const data = (await searchRes.json()) as {
          total_count: number;
          items: Array<{ commit: { author: { date: string } } }>;
        };

        const commitsByDay: Record<string, number> = {};

        for (const item of data.items) {
          const date = item.commit.author.date.slice(0, 10);
          commitsByDay[date] = (commitsByDay[date] ?? 0) + 1;
        }

        return {
          days,
          total: data.total_count,
          data: commitsByDay,
        };
      }
    );
  } catch {
    return null;
  }
}

export async function fetchStreakForChatbot(
  token: string,
  githubLogin: string,
  cacheContext: CacheContext
) {
  try {
    const key = metricsCacheKey(cacheContext.userId, "streak", {
      githubLogin,
    });

    const dates = await withMetricsCache(
      {
        bypass: cacheContext.bypass,
        key,
        ttlSeconds: METRICS_CACHE_TTL_SECONDS.streak,
      },
      async () => {
        const since = new Date();
        since.setDate(since.getDate() - 90);
        const sinceStr = toDateStr(since);

        const activeDates = new Set<string>();
        let page = 1;

        while (true) {
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

          if (!searchRes.ok) return [];

          const data = (await searchRes.json()) as {
            items: Array<{ commit: { author: { date: string } } }>;
          };

          for (const item of data.items) {
            activeDates.add(item.commit.author.date.slice(0, 10));
          }

          if (data.items.length < 100 || page >= 10) break;
          page++;
        }

        return Array.from(activeDates);
      }
    );

    const commitDays = Array.from(new Set(dates)).sort();

    if (commitDays.length === 0) {
      return {
        current: 0,
        longest: 0,
        lastCommitDate: null,
        totalActiveDays: 0,
      };
    }

    let longest = 1;
    let currentRun = 1;
    const runs: { start: string; end: string; length: number }[] = [];
    let runStart = commitDays[0];

    for (let i = 1; i < commitDays.length; i++) {
      const diff = dateDiffDays(commitDays[i - 1], commitDays[i]);

      if (diff === 1) {
        currentRun++;
        longest = Math.max(longest, currentRun);
      } else {
        runs.push({
          start: runStart,
          end: commitDays[i - 1],
          length: currentRun,
        });

        runStart = commitDays[i];
        currentRun = 1;
      }
    }

    runs.push({
      start: runStart,
      end: commitDays[commitDays.length - 1],
      length: currentRun,
    });

    const today = toDateStr(new Date());
    const yesterday = toDateStr(new Date(Date.now() - 86400000));
    const lastRun = runs[runs.length - 1];

    return {
      current:
        lastRun.end === today || lastRun.end === yesterday
          ? lastRun.length
          : 0,
      longest,
      lastCommitDate: commitDays[commitDays.length - 1],
      totalActiveDays: commitDays.length,
    };
  } catch {
    return null;
  }
}

export async function fetchLanguagesForChatbot(
  token: string,
  githubLogin: string
) {
  try {
    const repos = await fetchReposForChatbot(token, githubLogin, 90, {
      bypass: false,
      userId: githubLogin,
    });

    if (!repos?.repos?.length) return null;

    const langTotals: Record<string, number> = {};

    await Promise.all(
      repos.repos.map(async (repo) => {
        try {
          const res = await fetch(`${GITHUB_API}/repos/${repo.name}/languages`, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/vnd.github+json",
            },
            cache: "no-store",
          });

          if (!res.ok) return;

          const langs = (await res.json()) as Record<string, number>;

          for (const [lang, bytes] of Object.entries(langs)) {
            langTotals[lang] = (langTotals[lang] ?? 0) + bytes;
          }
        } catch {
          return;
        }
      })
    );

    const totalBytes = Object.values(langTotals).reduce(
      (sum, bytes) => sum + bytes,
      0
    );

    const languages = Object.entries(langTotals)
      .map(([name, bytes]) => ({
        name,
        bytes,
        percentage:
          totalBytes > 0 ? Math.round((bytes / totalBytes) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 6);

    return { languages };
  } catch {
    return null;
  }
}

export async function fetchIssuesForChatbot(token: string) {
  try {
    return await fetchIssuesMetrics(token);
  } catch {
    return null;
  }
}

export async function fetchPRsForChatbot(
  token: string,
  cacheContext: CacheContext
) {
  try {
    const key = metricsCacheKey(cacheContext.userId, "prs");

    return await withMetricsCache(
      {
        bypass: cacheContext.bypass,
        key,
        ttlSeconds: METRICS_CACHE_TTL_SECONDS.prs,
      },
      async () => {
        const searchRes = await fetch(
          `${GITHUB_API}/search/issues?q=type:pr+author:@me&sort=updated&order=desc&per_page=100`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/vnd.github+json",
            },
            cache: "no-store",
          }
        );

        if (!searchRes.ok) return null;

        const data = (await searchRes.json()) as {
          total_count: number;
          items: Array<{
            state: string;
            created_at: string;
            pull_request?: { merged_at: string | null };
          }>;
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

        return {
          open,
          merged,
          total: data.total_count,
          avgReviewHours: Math.round(avgReviewMs / 3600000),
          mergeRate:
            sampleTotal > 0
              ? `${Math.round((merged / sampleTotal) * 100)}%`
              : "0%",
        };
      }
    );
  } catch {
    return null;
  }
}

export async function fetchCIForChatbot(
  token: string,
  githubLogin: string,
  cacheContext: CacheContext
) {
  try {
    const repos = await fetchReposForChatbot(token, githubLogin, 30, cacheContext);

    if (!repos?.repos?.length) return null;

    const runsByRepo = await Promise.all(
      repos.repos.slice(0, 5).map(async (repo) => {
        try {
          const created = toDateStr(new Date(Date.now() - 30 * 86400000));
          const params = new URLSearchParams({
            per_page: "100",
            created: `>=${created}`,
          });

          const res = await fetch(
            `${GITHUB_API}/repos/${repo.name}/actions/runs?${params.toString()}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github+json",
              },
              cache: "no-store",
            }
          );

          if (!res.ok) return [];

          const data = (await res.json()) as {
            workflow_runs?: Array<{
              conclusion: string | null;
              created_at: string;
              updated_at: string;
              name: string | null;
            }>;
          };

          return data.workflow_runs ?? [];
        } catch {
          return [];
        }
      })
    );

    const runs = runsByRepo.flat();
    const completedRuns = runs.filter((run) => run.conclusion);
    const successfulRuns = completedRuns.filter(
      (run) => run.conclusion === "success"
    );

    const totalDuration = completedRuns.reduce((sum, run) => {
      const created = new Date(run.created_at).getTime();
      const updated = new Date(run.updated_at).getTime();

      if (Number.isNaN(created) || Number.isNaN(updated) || updated < created) {
        return sum;
      }

      return sum + (updated - created) / 60000;
    }, 0);

    return {
      successRate:
        completedRuns.length === 0
          ? 0
          : Math.round((successfulRuns.length / completedRuns.length) * 100),
      averageDurationMinutes:
        completedRuns.length === 0
          ? 0
          : Math.round((totalDuration / completedRuns.length) * 10) / 10,
      totalRuns: runs.length,
      reposChecked: repos.repos.slice(0, 5).length,
    };
  } catch {
    return null;
  }
}

export async function fetchWeeklySummaryForChatbot(
  token: string,
  githubLogin: string
) {
  try {
    const now = new Date();
    const currentWeekStart = new Date(now);
    const dayOfWeek = currentWeekStart.getUTCDay();
    const daysSinceMonday = (dayOfWeek + 6) % 7;

    currentWeekStart.setUTCDate(
      currentWeekStart.getUTCDate() - daysSinceMonday
    );
    currentWeekStart.setUTCHours(0, 0, 0, 0);

    const prevWeekStart = new Date(currentWeekStart.getTime() - 7 * 86400000);
    const prevWeekEnd = new Date(currentWeekStart.getTime() - 1);
    const fourteenDaysAgoStr = toDateStr(
      new Date(Date.now() - 14 * 86400000)
    );

    const commitsRes = await fetch(
      `${GITHUB_API}/search/commits?q=author:${githubLogin}+author-date:>=${fourteenDaysAgoStr}&per_page=100`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
        },
        cache: "no-store",
      }
    );

    if (!commitsRes.ok) return null;

    const commitsData = (await commitsRes.json()) as {
      items: Array<{
        commit: { author: { date: string } };
        repository: { full_name: string };
      }>;
    };

    let commitsThisWeek = 0;
    let commitsPrevWeek = 0;
    const activeDaysThisWeek = new Set<string>();
    const repoCounts = new Map<string, number>();

    for (const item of commitsData.items) {
      const commitDate = new Date(item.commit.author.date);

      if (commitDate >= currentWeekStart) {
        commitsThisWeek++;
        activeDaysThisWeek.add(item.commit.author.date.slice(0, 10));

        const repoName = item.repository.full_name;
        repoCounts.set(repoName, (repoCounts.get(repoName) ?? 0) + 1);
      } else if (commitDate >= prevWeekStart && commitDate <= prevWeekEnd) {
        commitsPrevWeek++;
      }
    }

    const topRepo =
      Array.from(repoCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ??
      null;

    const commitDelta = commitsThisWeek - commitsPrevWeek;

    return {
      commits: {
        current: commitsThisWeek,
        previous: commitsPrevWeek,
        delta: commitDelta,
        trend: commitDelta > 0 ? "up" : commitDelta < 0 ? "down" : "same",
      },
      activeDays: activeDaysThisWeek.size,
      topRepo,
    };
  } catch {
    return null;
  }
}