import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

const GITHUB_API = "https://api.github.com";
const GITLAB_API = "https://gitlab.com/api/v4";

interface GitHubCommitSearchResponse {
  total_count: number;
  items: Array<{ commit: { author: { date: string } } }>;
}

interface GitLabEvent {
  created_at: string;
  push_data?: { commit_count?: number };
}

interface TimeBlocks {
  morning: number;
  afternoon: number;
  evening: number;
  night: number;
}

function incrementDay(
  target: Record<string, number>,
  date: string,
  count: number
) {
  target[date] = (target[date] ?? 0) + count;
}

function incrementTimeBlocks(
  blocks: TimeBlocks,
  rawDate: string,
  count: number
) {
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime()) || count <= 0) {
    return;
  }

  const hour = parsed.getHours();
  if (hour >= 6 && hour < 12) {
    blocks.morning += count;
  } else if (hour >= 12 && hour < 18) {
    blocks.afternoon += count;
  } else if (hour >= 18 && hour < 22) {
    blocks.evening += count;
  } else {
    blocks.night += count;
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken || !session.githubLogin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const days = Number(req.nextUrl.searchParams.get("days")) || 30;

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);
  const sinceMs = since.getTime();

  // Commits search API captures all commits authored by the user —
  // including web UI commits, merge commits, PRs — unlike the events API
  // which only catches PushEvents from direct pushes.
  const searchRes = await fetch(
    `${GITHUB_API}/search/commits?q=author:${session.githubLogin}+author-date:>=${sinceStr}&per_page=100&sort=author-date&order=desc`,
    {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        Accept: "application/vnd.github+json",
      },
      cache: "no-store",
    },
  );

  if (!searchRes.ok) {
    return Response.json({ error: "GitHub API error" }, { status: 502 });
  }

  const data = (await searchRes.json()) as GitHubCommitSearchResponse;

  const githubCommitsByDay: Record<string, number> = {};
  const gitlabCommitsByDay: Record<string, number> = {};
  const commitsByDay: Record<string, number> = {};
  const timeBlocks: TimeBlocks = {
    morning: 0, // 6-11
    afternoon: 0, // 12-17
    evening: 0, // 18-21
    night: 0, // 22-5
  };

  for (const item of data.items) {
    const rawDate = item.commit.author.date;
    const date = rawDate.slice(0, 10);
    incrementDay(githubCommitsByDay, date, 1);
    incrementDay(commitsByDay, date, 1);
    incrementTimeBlocks(timeBlocks, rawDate, 1);
  }

  let gitlabTotal = 0;
  const gitlabToken =
    typeof session.gitlabToken === "string" ? session.gitlabToken : null;

  if (gitlabToken) {
    try {
      const gitlabRes = await fetch(
        `${GITLAB_API}/events?action=pushed&per_page=100`,
        {
          headers: { Authorization: `Bearer ${gitlabToken}` },
          cache: "no-store",
        }
      );

      if (gitlabRes.ok) {
        const events = (await gitlabRes.json()) as GitLabEvent[];
        for (const event of events) {
          if (!event.created_at) {
            continue;
          }

          const createdAtMs = Date.parse(event.created_at);
          if (Number.isNaN(createdAtMs) || createdAtMs < sinceMs) {
            continue;
          }

          const commitCountRaw = event.push_data?.commit_count;
          const commitCount =
            typeof commitCountRaw === "number" && Number.isFinite(commitCountRaw)
              ? commitCountRaw
              : 1;

          if (commitCount <= 0) {
            continue;
          }

          const date = event.created_at.slice(0, 10);
          incrementDay(gitlabCommitsByDay, date, commitCount);
          incrementDay(commitsByDay, date, commitCount);
          incrementTimeBlocks(timeBlocks, event.created_at, commitCount);
          gitlabTotal += commitCount;
        }
      }
    } catch {
      // Non-fatal: fall back to GitHub-only data if GitLab fails.
    }
  }

  return Response.json({
    days,
    total: data.total_count + gitlabTotal,
    data: commitsByDay,
    timeBlocks,
    sources: {
      github: { total: data.total_count, data: githubCommitsByDay },
      gitlab: gitlabToken ? { total: gitlabTotal, data: gitlabCommitsByDay } : null,
    },
  });
}
