import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

const GITHUB_API = "https://api.github.com";
const GITLAB_API = "https://gitlab.com/api/v4";

interface GitHubPRItem {
  state: string;
  created_at: string;
  closed_at: string | null;
}

interface GitHubSearchResponse {
  total_count: number;
  items: GitHubPRItem[];
}

interface GitLabMRItem {
  state: string;
  created_at: string;
  merged_at: string | null;
  closed_at: string | null;
}

interface ReviewStats {
  open: number;
  merged: number;
  total: number;
  reviewMs: number;
  reviewCount: number;
}

function buildResponse(stats: ReviewStats) {
  const avgReviewHours =
    stats.reviewCount > 0
      ? Math.round(stats.reviewMs / stats.reviewCount / 3600000)
      : 0;

  return {
    open: stats.open,
    merged: stats.merged,
    total: stats.total,
    avgReviewHours,
    mergeRate:
      stats.total > 0
        ? `${Math.round((stats.merged / stats.total) * 100)}%`
        : "0%",
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchRes = await fetch(
    `${GITHUB_API}/search/issues?q=type:pr+author:@me&per_page=100`,
    {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      cache: "no-store",
    }
  );

  if (!searchRes.ok) {
    return Response.json({ error: "GitHub API error" }, { status: 502 });
  }

  const data = (await searchRes.json()) as GitHubSearchResponse;

  const githubStats: ReviewStats = {
    open: 0,
    merged: 0,
    total: data.total_count,
    reviewMs: 0,
    reviewCount: 0,
  };

  for (const pr of data.items) {
    if (pr.state === "open") githubStats.open++;
    if (pr.state === "closed") githubStats.merged++;
    if (pr.closed_at) {
      githubStats.reviewMs +=
        new Date(pr.closed_at).getTime() - new Date(pr.created_at).getTime();
      githubStats.reviewCount++;
    }
  }

  let gitlabStats: ReviewStats | null = null;
  const gitlabToken =
    typeof session.gitlabToken === "string" ? session.gitlabToken : null;

  if (gitlabToken) {
    try {
      const gitlabRes = await fetch(
        `${GITLAB_API}/merge_requests?scope=created_by_me&state=all&per_page=100`,
        {
          headers: { Authorization: `Bearer ${gitlabToken}` },
          cache: "no-store",
        }
      );

      if (gitlabRes.ok) {
        const mrs = (await gitlabRes.json()) as GitLabMRItem[];
        gitlabStats = {
          open: 0,
          merged: 0,
          total: mrs.length,
          reviewMs: 0,
          reviewCount: 0,
        };

        for (const mr of mrs) {
          if (mr.state === "opened") gitlabStats.open++;
          if (mr.state === "merged") gitlabStats.merged++;

          const closedAt = mr.merged_at ?? mr.closed_at;
          if (closedAt) {
            gitlabStats.reviewMs +=
              new Date(closedAt).getTime() - new Date(mr.created_at).getTime();
            gitlabStats.reviewCount++;
          }
        }
      }
    } catch {
      // Non-fatal: keep GitHub-only response if GitLab fails.
    }
  }

  const combinedStats: ReviewStats = gitlabStats
    ? {
        open: githubStats.open + gitlabStats.open,
        merged: githubStats.merged + gitlabStats.merged,
        total: githubStats.total + gitlabStats.total,
        reviewMs: githubStats.reviewMs + gitlabStats.reviewMs,
        reviewCount: githubStats.reviewCount + gitlabStats.reviewCount,
      }
    : githubStats;

  return Response.json({
    ...buildResponse(combinedStats),
    sources: {
      github: buildResponse(githubStats),
      gitlab: gitlabStats ? buildResponse(gitlabStats) : null,
    },
  });
}
