import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";
import { GITHUB_API } from "@/lib/github";
import {
  isMetricsCacheBypassed,
  METRICS_CACHE_TTL_SECONDS,
  metricsCacheKey,
  withMetricsCache,
} from "@/lib/metrics-cache";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken || !session.githubLogin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const days = Number(req.nextUrl.searchParams.get("days")) || 30;
  const bypass = isMetricsCacheBypassed(req);
  const key = metricsCacheKey(
    session.githubId ?? session.githubLogin,
    "contributions",
    { days }
  );

  try {
    const result = await withMetricsCache(
      {
        bypass,
        key,
        ttlSeconds: METRICS_CACHE_TTL_SECONDS.contributions,
      },
      async () => {
        const since = new Date();
        since.setDate(since.getDate() - days);
        const sinceStr = since.toISOString().slice(0, 10);

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

        if (!searchRes.ok) throw new Error("GitHub API error");

        const data = (await searchRes.json()) as {
          items: Array<{ commit: { author: { date: string } } }>;
        };

        // Initialize all 24 hours to 0
        const hourMap: Record<number, number> = {};
        for (let i = 0; i < 24; i++) hourMap[i] = 0;

        // NOTE: date.getHours() returns UTC hours from the server,
        // not the user's local timezone. The client displays these as-is.
        for (const item of data.items) {
          const date = new Date(item.commit.author.date);
          const hour = date.getHours();
          hourMap[hour]++;
        }

        const hours = Array.from({ length: 24 }, (_, i) => ({
          hour: i,
          commits: hourMap[i],
        }));

        return { days, hours };
      }
    );

    return Response.json(result);
  } catch {
    return Response.json({ error: "GitHub API error" }, { status: 502 });
  }
}
