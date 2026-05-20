import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";
import { calculateRepoHealth, percentageFromMap, colorFor } from "@/lib/repoAnalyticsUtils";
import { RepoAnalyticsResponse } from "@/lib/repoAnalytics";

const GITHUB_API = "https://api.github.com";

export const dynamic = "force-dynamic";

function dateKey(value: string) {
  return value.slice(0, 10);
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const fullName = req.nextUrl.searchParams.get("repo");
  if (!fullName) return Response.json({ error: "Missing repo" }, { status: 400 });

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [repoRes, languagesRes, contributorsRes, commitsRes, pullsRes, issuesRes] = await Promise.all([
    fetch(`${GITHUB_API}/repos/${fullName}`, { headers: { Authorization: `Bearer ${session.accessToken}`, Accept: "application/vnd.github+json" }, cache: "no-store" }),
    fetch(`${GITHUB_API}/repos/${fullName}/languages`, { headers: { Authorization: `Bearer ${session.accessToken}`, Accept: "application/vnd.github+json" }, cache: "no-store" }),
    fetch(`${GITHUB_API}/repos/${fullName}/contributors?per_page=8`, { headers: { Authorization: `Bearer ${session.accessToken}`, Accept: "application/vnd.github+json" }, cache: "no-store" }),
    fetch(`${GITHUB_API}/repos/${fullName}/commits?since=${since.toISOString()}&per_page=100`, { headers: { Authorization: `Bearer ${session.accessToken}`, Accept: "application/vnd.github+json" }, cache: "no-store" }),
    fetch(`${GITHUB_API}/repos/${fullName}/pulls?state=all&per_page=100`, { headers: { Authorization: `Bearer ${session.accessToken}`, Accept: "application/vnd.github+json" }, cache: "no-store" }),
    fetch(`${GITHUB_API}/repos/${fullName}/issues?state=all&per_page=100`, { headers: { Authorization: `Bearer ${session.accessToken}`, Accept: "application/vnd.github+json" }, cache: "no-store" }),
  ]);

  if (!repoRes.ok) return Response.json({ error: "Failed to fetch repository analytics" }, { status: 502 });

  const repo = await repoRes.json() as {
    full_name: string; description: string | null; stargazers_count: number; forks_count: number; open_issues_count: number;
    subscribers_count: number; license: { spdx_id: string } | null; created_at: string; updated_at: string; default_branch: string;
  };

  const rawLang = languagesRes.ok ? await languagesRes.json() as Record<string, number> : {};
  const languageBreakdown = percentageFromMap(rawLang).map((entry) => ({ ...entry, color: colorFor(entry.name) }));

  const contributorsRaw = contributorsRes.ok ? await contributorsRes.json() as Array<{ login: string; avatar_url: string; contributions: number }> : [];
  const totalContrib = contributorsRaw.reduce((sum, c) => sum + c.contributions, 0) || 1;
  const contributors = contributorsRaw.slice(0, 6).map((c) => ({
    login: c.login,
    avatarUrl: c.avatar_url,
    commits: c.contributions,
    percentage: Math.round((c.contributions / totalContrib) * 100),
  }));

  const commits = commitsRes.ok ? await commitsRes.json() as Array<{ commit: { author: { date: string } } }> : [];
  const pulls = pullsRes.ok ? await pullsRes.json() as Array<{ created_at: string; closed_at: string | null }> : [];
  const issues = issuesRes.ok ? await issuesRes.json() as Array<{ created_at: string; pull_request?: unknown }> : [];

  const timelineMap = new Map<string, { commits: number; prs: number; issues: number }>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    timelineMap.set(dateKey(d.toISOString()), { commits: 0, prs: 0, issues: 0 });
  }

  commits.forEach((c) => {
    const key = dateKey(c.commit.author.date);
    const p = timelineMap.get(key);
    if (p) p.commits += 1;
  });

  pulls.forEach((pr) => {
    const key = dateKey(pr.created_at);
    const p = timelineMap.get(key);
    if (p) p.prs += 1;
  });

  issues.filter((i) => !i.pull_request).forEach((issue) => {
    const key = dateKey(issue.created_at);
    const p = timelineMap.get(key);
    if (p) p.issues += 1;
  });

  const timeline = Array.from(timelineMap.entries()).map(([date, stats]) => ({ date, ...stats }));
  const heatmap = timeline.map((t) => ({ date: t.date, count: t.commits }));

  const prsOpened = pulls.length;
  const prsClosed = pulls.filter((pr) => pr.closed_at).length;
  const activeCommitDays = timeline.filter((d) => d.commits > 0).length;

  const health = calculateRepoHealth({
    commitsLast30Days: commits.length,
    commitDaysActive: activeCommitDays,
    openIssues: repo.open_issues_count,
    prsOpened,
    prsClosed,
  });

  const response: RepoAnalyticsResponse = {
    overview: {
      fullName: repo.full_name,
      description: repo.description,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      openIssues: repo.open_issues_count,
      watchers: repo.subscribers_count,
      license: repo.license?.spdx_id ?? "No license",
      createdAt: repo.created_at,
      updatedAt: repo.updated_at,
      defaultBranch: repo.default_branch,
    },
    contributors,
    timeline,
    heatmap,
    health,
    languageBreakdown,
    primaryStack: languageBreakdown.slice(0, 3).map((l) => l.name),
  };

  return Response.json(response);
}
