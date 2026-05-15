import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { NextRequest } from "next/server";
import { getLastWeekRange, getThisWeekRange } from "@/lib/dateUtils";

export const dynamic = "force-dynamic";

const GITHUB_API = "https://api.github.com";

interface CommitSearchResponse {
  total_count: number;
  items: Array<{
    repository: { full_name: string };
    commit: { author: { date: string } };
  }>;
}

interface PullRequestSearchResponse {
  total_count: number;
  items: Array<Record<string, unknown>>;
}

async function fetchGitHubJson<T>(
  url: string,
  accessToken: string,
  accept: string = "application/vnd.github+json"
): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: accept,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  return (await response.json()) as T;
}

async function fetchCommitSearch(
  githubLogin: string,
  accessToken: string,
  start: string,
  end: string
): Promise<CommitSearchResponse> {
  const query = encodeURIComponent(
    `author:${githubLogin} committer-date:${start}..${end}`
  );

  // TODO: paginate for high-activity users
  return fetchGitHubJson<CommitSearchResponse>(
    `${GITHUB_API}/search/commits?q=${query}&per_page=100`,
    accessToken,
    "application/vnd.github+json"
  );
}

async function fetchPullRequestsOpenedThisWeek(
  githubLogin: string,
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<number> {
  const query = encodeURIComponent(
    `type:pr author:${githubLogin} created:${startDate}..${endDate}`
  );
  const data = await fetchGitHubJson<PullRequestSearchResponse>(
    `${GITHUB_API}/search/issues?q=${query}&per_page=100`,
    accessToken
  );

  return data.items.length;
}

async function fetchPullRequestsMergedThisWeek(
  githubLogin: string,
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<number> {
  const query = encodeURIComponent(
    `type:pr author:${githubLogin} is:merged merged:${startDate}..${endDate}`
  );
  const data = await fetchGitHubJson<PullRequestSearchResponse>(
    `${GITHUB_API}/search/issues?q=${query}&per_page=100`,
    accessToken
  );

  return data.total_count;
}

function deriveMostActiveRepo(items: CommitSearchResponse["items"]): string | null {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const name = item.repository.full_name;
    counts[name] = (counts[name] ?? 0) + 1;
  }
  const entries = Object.entries(counts);
  if (entries.length === 0) return null;
  return entries.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken || !session.githubLogin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const thisWeekRange = getThisWeekRange();
  const lastWeekRange = getLastWeekRange();
  const thisWeekStartDate = thisWeekRange.start.slice(0, 10);
  const thisWeekEndDate = thisWeekRange.end.slice(0, 10);

  const results = await Promise.allSettled([
    fetchCommitSearch(
      session.githubLogin,
      session.accessToken,
      thisWeekRange.start,
      thisWeekRange.end
    ),
    fetchCommitSearch(
      session.githubLogin,
      session.accessToken,
      lastWeekRange.start,
      lastWeekRange.end
    ),
    fetchPullRequestsOpenedThisWeek(
      session.githubLogin,
      session.accessToken,
      thisWeekStartDate,
      thisWeekEndDate
    ),
    fetchPullRequestsMergedThisWeek(
      session.githubLogin,
      session.accessToken,
      thisWeekStartDate,
      thisWeekEndDate
    ),
    fetch(`${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/metrics/streak`, {
      headers: { cookie: req.headers.get("cookie") ?? "" },
      cache: "no-store",
    }).then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
  ]);

  const fulfilledCount = results.filter(
    (result) => result.status === "fulfilled"
  ).length;

  if (fulfilledCount === 0) {
    return Response.json({ error: "GitHub API error" }, { status: 502 });
  }

  const currentWeekCommits =
    results[0].status === "fulfilled" ? results[0].value.total_count : null;
  const lastWeekCommits =
    results[1].status === "fulfilled" ? results[1].value.total_count : null;
  const openedPRs = results[2].status === "fulfilled" ? results[2].value : null;
  const mergedPRs = results[3].status === "fulfilled" ? results[3].value : null;
  const mostActiveRepo =
    results[0].status === "fulfilled"
      ? deriveMostActiveRepo(results[0].value.items)
      : null;
  const activeDayCommitData =
    results[0].status === "fulfilled" ? results[0].value.items : null;

  const activeDays = activeDayCommitData
    ? new Set(activeDayCommitData.map((item) => item.commit.author.date.slice(0, 10)))
        .size
    : null;
  const streak =
    results[4].status === "fulfilled"
      ? (results[4].value as { currentStreak: number }).currentStreak
      : null;

  return Response.json({
    commits: {
      current: currentWeekCommits,
      last: lastWeekCommits,
      delta:
        currentWeekCommits !== null && lastWeekCommits !== null
          ? currentWeekCommits - lastWeekCommits
          : null,
    },
    pullRequests: {
      opened: openedPRs,
      merged: mergedPRs,
    },
    activeDays,
    streak,
    mostActiveRepo,
    weekStart: thisWeekRange.start,
    generatedAt: new Date().toISOString(),
  });
}
