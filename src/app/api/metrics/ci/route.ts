import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";
import {
  getAccountToken,
  getAllAccounts,
  mergeMetrics,
} from "@/lib/github-accounts";
import { GITHUB_API } from "@/lib/github";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveAppUser } from "@/lib/resolve-user";

export const dynamic = "force-dynamic";

interface TopRepo {
  name: string;
  commits: number;
}

interface WorkflowRun {
  conclusion: string | null;
  created_at: string;
  name: string | null;
  updated_at: string;
}

interface WorkflowStats {
  failures: number;
  total: number;
}

interface CIAnalyticsResponse {
  successRate: number;
  averageDurationMinutes: number;
  flakiestWorkflow: string | null;
  totalRuns: number;
  reposChecked: number;
}

class GitHubApiError extends Error {
  status: number;
  endpoint: string;
  details: string;

  constructor(endpoint: string, status: number, details: string) {
    super("GitHub API failed");
    this.status = status;
    this.endpoint = endpoint;
    this.details = details;
  }
}

function toGitHubErrorResponse(error: unknown) {
  if (error instanceof GitHubApiError) {
    return Response.json(
      {
        error: "GitHub API failed",
        endpoint: error.endpoint,
        status: error.status,
        details: error.details,
      },
      { status: error.status }
    );
  }
  return Response.json({ error: "GitHub API error" }, { status: 502 });
}

function toIsoDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function getRunDurationMinutes(run: WorkflowRun): number {
  const created = new Date(run.created_at).getTime();
  const updated = new Date(run.updated_at).getTime();

  if (Number.isNaN(created) || Number.isNaN(updated) || updated < created) {
    return 0;
  }

  return (updated - created) / 60000;
}

function mergeCIAnalytics(
  a: CIAnalyticsResponse,
  b: CIAnalyticsResponse
): CIAnalyticsResponse {
  const totalRuns = a.totalRuns + b.totalRuns;
  const weightedDuration =
    totalRuns === 0
      ? 0
      : (a.averageDurationMinutes * a.totalRuns +
          b.averageDurationMinutes * b.totalRuns) /
        totalRuns;
  const successes =
    Math.round((a.successRate / 100) * a.totalRuns) +
    Math.round((b.successRate / 100) * b.totalRuns);

  return {
    successRate: totalRuns === 0 ? 0 : Math.round((successes / totalRuns) * 100),
    averageDurationMinutes: Math.round(weightedDuration * 10) / 10,
    flakiestWorkflow: a.flakiestWorkflow ?? b.flakiestWorkflow,
    totalRuns,
    reposChecked: a.reposChecked + b.reposChecked,
  };
}

async function fetchTopRepos(
  token: string,
  githubLogin: string
): Promise<TopRepo[]> {
  const since = toIsoDate(30);
  const endpoint = `${GITHUB_API}/search/commits?q=author:${githubLogin}+author-date:>=${since}&per_page=100&sort=author-date&order=desc`;
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
    items: Array<{ repository: { full_name: string } }>;
  };
  const repoMap = new Map<string, number>();

  for (const item of data.items) {
    const name = item.repository.full_name;
    repoMap.set(name, (repoMap.get(name) ?? 0) + 1);
  }

  return Array.from(repoMap.entries())
    .map(([name, commits]) => ({ name, commits }))
    .sort((a, b) => b.commits - a.commits)
    .slice(0, 5);
}

async function fetchWorkflowRuns(
  token: string,
  repo: string
): Promise<WorkflowRun[]> {
  const created = toIsoDate(30);
  const params = new URLSearchParams({
    per_page: "100",
    created: `>=${created}`,
  });
  const endpoint = `${GITHUB_API}/repos/${repo}/actions/runs?${params.toString()}`;
  const res = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
      cache: "no-store",
    });

  if (res.status === 404 || res.status === 403) {
    return [];
  }

  if (!res.ok) {
    const body = await res.text();
    console.error("GitHub API failed", {
      endpoint,
      status: res.status,
      body,
    });
    throw new GitHubApiError(endpoint, res.status, body);
  }

  const data = (await res.json()) as { workflow_runs?: WorkflowRun[] };
  return data.workflow_runs ?? [];
}

function aggregateRuns(
  repos: TopRepo[],
  runsByRepo: WorkflowRun[][]
): CIAnalyticsResponse {
  const runs = runsByRepo.flat();
  const completedRuns = runs.filter((run) => run.conclusion);
  const successfulRuns = completedRuns.filter(
    (run) => run.conclusion === "success"
  );
  const workflowStats = new Map<string, WorkflowStats>();

  for (const run of completedRuns) {
    const name = run.name ?? "Unnamed workflow";
    const stats = workflowStats.get(name) ?? { failures: 0, total: 0 };
    stats.total += 1;
    if (run.conclusion !== "success") {
      stats.failures += 1;
    }
    workflowStats.set(name, stats);
  }

  const flakiestWorkflow =
    Array.from(workflowStats.entries())
      .filter(([, stats]) => stats.failures > 0)
      .sort((a, b) => {
        const aRate = a[1].failures / a[1].total;
        const bRate = b[1].failures / b[1].total;
        return bRate - aRate || b[1].failures - a[1].failures;
      })[0]?.[0] ?? null;

  const totalDuration = completedRuns.reduce(
    (sum, run) => sum + getRunDurationMinutes(run),
    0
  );

  return {
    successRate:
      completedRuns.length === 0
        ? 0
        : Math.round((successfulRuns.length / completedRuns.length) * 100),
    averageDurationMinutes:
      completedRuns.length === 0
        ? 0
        : Math.round((totalDuration / completedRuns.length) * 10) / 10,
    flakiestWorkflow,
    totalRuns: runs.length,
    reposChecked: repos.length,
  };
}

async function fetchCIAnalyticsForAccount(
  token: string,
  githubLogin: string
): Promise<CIAnalyticsResponse> {
  const repos = await fetchTopRepos(token, githubLogin);
  const runsByRepo = await Promise.all(
    repos.map((repo) => fetchWorkflowRuns(token, repo.name))
  );

  return aggregateRuns(repos, runsByRepo);
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken || !session.githubLogin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accountId = req.nextUrl.searchParams.get("accountId");

  if (!accountId) {
    try {
      const result = await fetchCIAnalyticsForAccount(
        session.accessToken,
        session.githubLogin
      );
      return Response.json(result);
    } catch (error) {
      return toGitHubErrorResponse(error);
    }
  }

  if (!session.githubId) {
    return Response.json({ error: "User not found" }, { status: 404 });
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
        fetchCIAnalyticsForAccount(account.token, account.githubLogin)
      )
    );
    const merged = mergeMetrics(results, mergeCIAnalytics);

    if (!merged) {
      return Response.json({ error: "GitHub API error" }, { status: 502 });
    }

    return Response.json(merged);
  }

  if (accountId === session.githubId) {
    try {
      const result = await fetchCIAnalyticsForAccount(
        session.accessToken,
        session.githubLogin
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
    const result = await fetchCIAnalyticsForAccount(
      accountToken,
      accountRow.github_login
    );
    return Response.json(result);
  } catch (error) {
    return toGitHubErrorResponse(error);
  }
}
