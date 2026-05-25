import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  isMetricsCacheBypassed,
  METRICS_CACHE_TTL_SECONDS,
  metricsCacheKey,
  withMetricsCache,
} from "@/lib/metrics-cache";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.accessToken || !session.githubLogin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const username = session.githubLogin;

  // 1. Check if the user is forcing a refresh
  const bypass = isMetricsCacheBypassed(request);
  
  // 2. Generate a unique cache key for this user's PRs
  const key = metricsCacheKey(session.githubId ?? session.githubLogin, "prs");

  try {
    // 3. Wrap your custom PR processing logic inside the bulletproof cache function!
    const metrics = await withMetricsCache(
      { bypass, key, ttlSeconds: METRICS_CACHE_TTL_SECONDS.prs },
      async () => {
        const { searchParams } = new URL(request.url);
        const range = searchParams.get("range") || "30";

        const daysLimit = parseInt(range, 10);
        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - daysLimit);
        const sinceIso = sinceDate.toISOString().split("T")[0];

        // This queries the Pull Requests authored by the user
        const githubUrl = `https://api.github.com/search/issues?q=author:${username}+type:pr+created:>=${sinceIso}&per_page=100`;

        const res = await fetch(githubUrl, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        });
        
        if (!res.ok) throw new Error("GitHub API error");
        const data = await res.json();
        const prs = data.items || [];

        let totalOpen = 0;
        let totalClosed = 0;
        let mergedThisWeek = 0;

        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        prs.forEach((pr: { state: string; closed_at: string | null; pull_request?: { merged_at?: string | null } }) => {
          if (pr.state === "open") {
            totalOpen++;
          } else if (pr.state === "closed") {
            totalClosed++;
            // Check if it was explicitly merged this week
            const closedAt = pr.closed_at ? new Date(pr.closed_at) : null;
            if (closedAt && closedAt.getTime() >= oneWeekAgo.getTime()) {
              mergedThisWeek++;
            }
          }
        });

        return {
          stats: {
            totalOpen,
            totalClosed,
            mergedThisWeek,
          },
        };
      }
    );
    
    return NextResponse.json(metrics);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load PR metrics" },
      { status: 502 }
    );
  }
}