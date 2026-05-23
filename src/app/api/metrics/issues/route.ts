import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";
import { fetchIssuesMetrics } from "@/lib/github";
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

  // 1. Check if the user is forcing a refresh
  const bypass = isMetricsCacheBypassed(req);
  
  // 2. Generate a unique cache key for this user's issues
  const key = metricsCacheKey(session.githubId ?? session.githubLogin, "issues");

  try {
    // 3. Wrap the GitHub fetch in our bulletproof cache!
    const metrics = await withMetricsCache(
      { bypass, key, ttlSeconds: METRICS_CACHE_TTL_SECONDS.issues },
      () => fetchIssuesMetrics(session.accessToken!)
    );
    
    return Response.json(metrics);
  } catch {
    return Response.json({ error: "GitHub API error" }, { status: 502 });
  }
}
