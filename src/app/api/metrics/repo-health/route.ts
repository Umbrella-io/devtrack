import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";
import { computeHealthScore } from "@/lib/repo-health";
import type { RepoHealthResponse, RepoHealthSignals, RepoHealthScore } from "@/types/repo-health";

export const dynamic = "force-dynamic";

const GITHUB_API = "https://api.github.com";

interface RepoSummary {
  name: string; // owner/repo
  commits: number;
  url: string;
}

interface RepoListResponse {
  repos: RepoSummary[];
  days: number;
}

async function fetchReposForAccount(
  token: string,
  githubLogin: string,
  days: number
): Promise<RepoListResponse> {
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
    }>;
  };

  const repoMap: Record<string, { commits: number; url: string }> = {};
  for (const item of data.items) {
    const name = item.repository.full_name;
    if (!repoMap[name]) {
      repoMap[name] = { commits: 0, url: item.repository.html_url };
    }
    repoMap[name].commits++;
  }

  const repos = Object.entries(repoMap)
    .map(([name, info]) => ({ name, ...info }))
    .sort((a, b) => b.commits - a.commits)
    .slice(0, 6);

  return { repos, days };
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function hoursBetween(a: string, b: string): number {
  return (new Date(b).getTime() - new Date(a).getTime()) / 3_600_000;
}

function daysSince(isoDate: string): number {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  return Math.max(0, Math.floor(diffMs / 86_400_000));
}

async function fetchJson<T>(url: string, token: string, accept?: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: accept ?? "application/vnd.github+json",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("GitHub API error");
  }
  return (await res.json()) as T;
}

async function fetchSignalsForRepo(
  token: string,
  repoFullName: string
): Promise<RepoHealthSignals> {
  const since30 = new Date();
  since30.setDate(since30.getDate() - 30);
  const since30Str = toDateStr(since30);

  // a) commit frequency in last 30 days (sampled to 100 via per_page=100)
  const commitSearch = await fetchJson<{
    items: unknown[];
  }>(
    `${GITHUB_API}/search/commits?q=repo:${repoFullName}+committer-date:>${since30Str}&per_page=100&sort=committer-date&order=desc`,
    token,
    "application/vnd.github+json"
  );
  const commitFrequency = Array.isArray(commitSearch.items) ? commitSearch.items.length : 0;

  // b) PR merge rate (opened vs merged in last 30 days)
  const openedPrs = await fetchJson<{
    total_count: number;
    items: Array<{ created_at: string; closed_at: string | null }>;
  }>(
    `${GITHUB_API}/search/issues?q=repo:${repoFullName}+type:pr+created:>${since30Str}&per_page=100&sort=created&order=desc`,
    token
  );

  const mergedPrs = await fetchJson<{
    total_count: number;
  }>(
    `${GITHUB_API}/search/issues?q=repo:${repoFullName}+type:pr+is:merged+merged:>${since30Str}&per_page=100&sort=updated&order=desc`,
    token
  );

  const openedCount = typeof openedPrs.total_count === "number" ? openedPrs.total_count : 0;
  const mergedCount = typeof mergedPrs.total_count === "number" ? mergedPrs.total_count : 0;
  const prMergeRate = openedCount > 0 ? mergedCount / openedCount : 0;

  // c) Avg PR open time (hours) for closed PRs in opened sample; default 0 if none
  const closedItems = (openedPrs.items ?? []).filter((i) => i.closed_at);
  const avgPrOpenTimeHours =
    closedItems.length > 0
      ? closedItems.reduce((sum, pr) => sum + hoursBetween(pr.created_at, pr.closed_at!), 0) /
        closedItems.length
      : 0;

  // d) open issues count
  const openIssues = await fetchJson<{ total_count: number }>(
    `${GITHUB_API}/search/issues?q=repo:${repoFullName}+type:issue+state:open&per_page=1`,
    token
  );
  const openIssuesCount = typeof openIssues.total_count === "number" ? openIssues.total_count : 0;

  // e) days since last commit
  const commits = await fetchJson<
    Array<{
      commit?: { committer?: { date?: string | null } };
    }>
  >(`${GITHUB_API}/repos/${repoFullName}/commits?per_page=1`, token);
  const lastCommitDate = commits?.[0]?.commit?.committer?.date ?? null;
  const daysSinceLastCommit = lastCommitDate ? daysSince(lastCommitDate) : 9999;

  return {
    commitFrequency,
    prMergeRate,
    avgPrOpenTimeHours,
    openIssuesCount,
    daysSinceLastCommit,
  };
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken || !session.githubLogin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1) Determine top repos (top 6 by commit count).
  let topRepos: RepoSummary[] = [];
  try {
    topRepos = (await fetchReposForAccount(session.accessToken, session.githubLogin, 30)).repos;
  } catch {
    return Response.json({ error: "GitHub API error" }, { status: 502 });
  }

  const scores: RepoHealthScore[] = [];

  // 2) Fetch per-repo signals sequentially to preserve rate limits.
  for (const repo of topRepos) {
    try {
      const signals = await fetchSignalsForRepo(session.accessToken, repo.name);
      scores.push(computeHealthScore(repo.name, signals));
    } catch {
      // Skip repo on any failure.
    }
  }

  const response: RepoHealthResponse = { repos: scores };
  return Response.json(response);
}
