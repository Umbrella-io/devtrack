import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

const GITHUB_API = "https://api.github.com";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken || !session.githubLogin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const days = Number(req.nextUrl.searchParams.get("days")) || 30;

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);

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
    }
  );

  if (!searchRes.ok) {
    return Response.json({ error: "GitHub API error" }, { status: 502 });
  }

  const data = (await searchRes.json()) as {
    total_count: number;
    items: Array<{ commit: { author: { date: string } } }>;
  };

  const commitsByDay: Record<string, number> = {};
  for (const item of data.items) {
    const date = item.commit.author.date.slice(0, 10);
    commitsByDay[date] = (commitsByDay[date] ?? 0) + 1;
  }

  return Response.json({ days, total: data.total_count, data: commitsByDay });
}
