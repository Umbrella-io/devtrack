import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";
import { isMetricsCacheBypassed, metricsCacheKey, withMetricsCache, METRICS_CACHE_TTL_SECONDS} from "@/lib/metrics-cache";

export const dynamic = "force-dynamic";
const GITHUB_API = "https://api.github.com";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken || !session.githubLogin) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const bypass = isMetricsCacheBypassed(req);
  const key = metricsCacheKey(session.githubId ?? session.githubLogin, "languages" as any);

  try {
    const data = await withMetricsCache({ bypass, key, ttlSeconds: METRICS_CACHE_TTL_SECONDS.languages }, async () => {
      const headers = { Authorization: `Bearer ${session.accessToken}`, Accept: "application/vnd.github+json" };
      const since = new Date();
      since.setDate(since.getDate() - 90);
      
      const searchRes = await fetch(
        `${GITHUB_API}/search/commits?q=author:${session.githubLogin}+author-date:>=${since.toISOString().slice(0, 10)}&per_page=100&sort=author-date&order=desc`,
        { headers, cache: "no-store" }
      );
      if (!searchRes.ok) throw new Error("API Error");

      const raw = await searchRes.json();
      const repoNames = Array.from(new Set<string>(raw.items.map((i: any) => i.repository.full_name)));
      const langTotals: Record<string, number> = {};

      await Promise.all(
        repoNames.map(async (repoName) => {
          try {
              const repoCacheKey = metricsCacheKey(
                session.githubId || session.githubLogin || "unknown",
                "repo_languages" as any,
                { repoName }
                );

              const langs = await withMetricsCache(
                {
                  bypass,
                  key: repoCacheKey,
                  ttlSeconds: METRICS_CACHE_TTL_SECONDS.languages,
                },
                async () => {
                  const res = await fetch(
                    `${GITHUB_API}/repos/${repoName}/languages`,
                    { headers, cache: "no-store" },
                  );

                  if (!res.ok) return {};

                  return await res.json();
                },
              );
            for (const [lang, bytes] of Object.entries(langs)) {
              langTotals[lang] = (langTotals[lang] ?? 0) + (bytes as number);
            }
          } catch {}
        })
      );

      const totalBytes = Object.values(langTotals).reduce((s, b) => s + b, 0);
      const languages = Object.entries(langTotals)
        .map(([name, bytes]) => ({ name, bytes, percentage: totalBytes > 0 ? Math.round((bytes / totalBytes) * 1000) / 10 : 0 }))
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, 6);

      return { languages };
    });
    return Response.json(data);
  } catch {
    return Response.json({ error: "GitHub API error" }, { status: 502 });
  }
}
