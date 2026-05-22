import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";
import { isMetricsCacheBypassed, metricsCacheKey, withMetricsCache } from "@/lib/metrics-cache";

export const dynamic = "force-dynamic";
const GITHUB_API = "https://api.github.com";

interface PRItem { state: string; draft?: boolean; pull_request?: { merged_at: string | null; }; }

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const bypass = isMetricsCacheBypassed(req);
  const key = metricsCacheKey(session.githubId ?? "unknown", "pr-breakdown" as any);

  try {
    const data = await withMetricsCache({ bypass, key, ttlSeconds: 10 * 60 }, async () => {
      const res = await fetch(`${GITHUB_API}/search/issues?q=type:pr+author:@me&per_page=100`, {
        headers: { Authorization: `Bearer ${session.accessToken}`, Accept: "application/vnd.github+json" },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("API Error");

      const raw = (await res.json()) as { items: PRItem[] };
      let draft = 0, open = 0, merged = 0, closed = 0;

      for (const pr of raw.items) {
        if (pr.state === "open" && pr.draft) draft++;
        else if (pr.state === "open") open++;
        else if (pr.pull_request?.merged_at) merged++;
        else closed++;
      }
      return { draft, open, merged, closed };
    });
    return Response.json(data);
  } catch {
    return Response.json({ error: "GitHub API error" }, { status: 502 });
  }
}
