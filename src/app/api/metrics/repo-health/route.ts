import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";
import { computeHealthScore } from "@/lib/repo-health";
import { isMetricsCacheBypassed, metricsCacheKey, withMetricsCache } from "@/lib/metrics-cache";
import type { RepoHealthResponse, RepoHealthSignals, RepoHealthScore } from "@/types/repo-health";

export const dynamic = "force-dynamic";
const GITHUB_API = "https://api.github.com";

interface RepoSummary { name: string; commits: number; url: string; }
interface RepoListResponse { repos: RepoSummary[]; days: number; }

async function fetchReposForAccount(token: string, githubLogin: string, days: number): Promise<RepoListResponse> {
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const searchRes = await fetch(`${GITHUB_API}/search/commits?q=author:${githubLogin}+author-date:>=${since}&per_page=100&sort=author-date&order=desc`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" }, cache: "no-store" });
  if (!searchRes.ok) throw new Error("API error");
  const data = await searchRes.json();
  const repoMap: Record<string, { commits: number; url: string }> = {};
  for (const item of data.items) {
    const name = item.repository.full_name;
    if (!repoMap[name]) repoMap[name] = { commits: 0, url: item.repository.html_url };
    repoMap[name].commits++;
  }
  return { repos: Object.entries(repoMap).map(([name, info]) => ({ name, ...info })).sort((a, b) => b.commits - a.commits).slice(0, 6), days };
}

function hoursBetween(a: string, b: string): number { return (new Date(b).getTime() - new Date(a).getTime()) / 3600000; }
function daysSince(isoDate: string): number { return Math.max(0, Math.floor((Date.now() - new Date(isoDate).getTime()) / 86400000)); }

async function fetchJson<T>(url: string, token: string, accept?: string): Promise<T> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: accept ?? "application/vnd.github+json" }, cache: "no-store" });
  if (!res.ok) throw new Error("API error");
  return await res.json();
}

async function fetchSignalsForRepo(token: string, repoFullName: string, days: number): Promise<RepoHealthSignals> {
  const since = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];
  const commitSearch = await fetchJson<any>(`${GITHUB_API}/search/commits?q=repo:${repoFullName}+committer-date:>${since}&per_page=100&sort=committer-date&order=desc`, token, "application/vnd.github+json");
  const openedPrs = await fetchJson<any>(`${GITHUB_API}/search/issues?q=repo:${repoFullName}+type:pr+created:>${since}&per_page=100&sort=created&order=desc`, token);
  const mergedPrs = await fetchJson<any>(`${GITHUB_API}/search/issues?q=repo:${repoFullName}+type:pr+is:merged+merged:>${since}&per_page=100&sort=updated&order=desc`, token);
  
  const openedCount = openedPrs.total_count || 0;
  const mergedCount = mergedPrs.total_count || 0;
  const closedItems = (openedPrs.items ?? []).filter((i: any) => i.closed_at);
  const avgPrOpenTimeHours = closedItems.length > 0 ? closedItems.reduce((sum: number, pr: any) => sum + hoursBetween(pr.created_at, pr.closed_at!), 0) / closedItems.length : 0;
  
  const openIssues = await fetchJson<any>(`${GITHUB_API}/search/issues?q=repo:${repoFullName}+type:issue+state:open&per_page=1`, token);
  const commits = await fetchJson<any>(`${GITHUB_API}/repos/${repoFullName}/commits?per_page=1`, token);
  const lastCommitDate = commits?.[0]?.commit?.committer?.date ?? null;

  return {
    commitFrequency: Array.isArray(commitSearch.items) ? commitSearch.items.length : 0,
    prMergeRate: openedCount > 0 ? mergedCount / openedCount : 0,
    avgPrOpenTimeHours,
    openIssuesCount: openIssues.total_count || 0,
    daysSinceLastCommit: lastCommitDate ? daysSince(lastCommitDate) : 9999,
  };
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken || !session.githubLogin) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const requestedDays = parseInt(req.nextUrl.searchParams.get("days") ?? "30", 10);
  const days = requestedDays === 7 || requestedDays === 30 || requestedDays === 90 ? requestedDays : 30;
  
  const bypass = isMetricsCacheBypassed(req);
  const key = metricsCacheKey(session.githubId ?? session.githubLogin, "repo-health" as any, { days });

  try {
    const data = await withMetricsCache({ bypass, key, ttlSeconds: 10 * 60 }, async () => {
      const topRepos = (await fetchReposForAccount(session.accessToken!, session.githubLogin!, days)).repos;
      const scores: RepoHealthScore[] = [];
      for (const repo of topRepos) {
        try {
          const signals = await fetchSignalsForRepo(session.accessToken!, repo.name, days);
          scores.push(computeHealthScore(repo.name, signals));
        } catch {}
      }
      return { repos: scores };
    });
    return Response.json(data);
  } catch {
    return Response.json({ error: "GitHub API error" }, { status: 502 });
  }
}
