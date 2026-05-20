import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";
import { GITHUB_API } from "@/lib/github";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken || !session.githubLogin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const days = Number(req.nextUrl.searchParams.get("days")) || 30;

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);

  try {
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
      items: Array<{ commit: { author: { date: string } } }>;
    };

    // Initialize all 24 hours to 0
    const hourMap: Record<number, number> = {};
    for (let i = 0; i < 24; i++) hourMap[i] = 0;

    // Group commits by local hour
    for (const item of data.items) {
      const date = new Date(item.commit.author.date);
      const hour = date.getHours(); // converts to local timezone
      hourMap[hour]++;
    }

    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      commits: hourMap[i],
    }));

    return Response.json({ days, hours });
  } catch {
    return Response.json({ error: "GitHub API error" }, { status: 502 });
  }
}