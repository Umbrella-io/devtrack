import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";
import { GITHUB_API } from "@/lib/github";
import { isMetricsCacheBypassed, metricsCacheKey, withMetricsCache } from "@/lib/metrics-cache";

export const dynamic = "force-dynamic";

function toDateStr(d: Date): string { return d.toISOString().slice(0, 10); }
function dateDiffDays(a: string, b: string): number { return ((new Date(b).getTime() - new Date(a).getTime()) / 86400000); }

function getCurrentWeekStartUtc(): Date {
  const now = new Date();
  const currentWeekStart = new Date(now);
  const dayOfWeek = currentWeekStart.getUTCDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  currentWeekStart.setUTCDate(currentWeekStart.getUTCDate() - daysSinceMonday);
  currentWeekStart.setUTCHours(0, 0, 0, 0);
  return currentWeekStart;
}

function calculateCurrentStreak(activeDates: Set<string>): number {
  const commitDays = Array.from(activeDates).sort();
  if (commitDays.length === 0) return 0;

  let currentRun = 1;
  const runs: { end: string; length: number }[] = [];

  for (let i = 1; i < commitDays.length; i++) {
    const diff = dateDiffDays(commitDays[i - 1], commitDays[i]);
    if (diff === 1) { currentRun++; } 
    else { runs.push({ end: commitDays[i - 1], length: currentRun }); currentRun = 1; }
  }
  runs.push({ end: commitDays[commitDays.length - 1], length: currentRun });

  const today = toDateStr(new Date());
  const yesterday = toDateStr(new Date(Date.now() - 86400000));
  const lastRun = runs[runs.length - 1];

  return lastRun.end === today || lastRun.end === yesterday ? lastRun.length : 0;
}

async function fetchActiveDates(githubLogin: string, token: string): Promise<Set<string>> {
  const since = new Date();
  since.setDate(since.getDate() - 90);
  const searchRes = await fetch(
    `${GITHUB_API}/search/commits?q=author:${githubLogin}+author-date:>=${since.toISOString().slice(0, 10)}&per_page=100&sort=author-date&order=desc`,
    { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" }, cache: "no-store" }
  );
  if (!searchRes.ok) throw new Error("GitHub API error");
  const data = (await searchRes.json()) as { items: Array<{ commit: { author: { date: string } } }> };
  return new Set(data.items.map(item => item.commit.author.date.slice(0, 10)));
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken || !session.githubLogin) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const bypass = isMetricsCacheBypassed(req);
  const key = metricsCacheKey(session.githubId ?? session.githubLogin, "weekly-summary" as any);

  try {
    const data = await withMetricsCache({ bypass, key, ttlSeconds: 5 * 60 }, async () => {
      const currentWeekStart = getCurrentWeekStartUtc();
      const prevWeekStart = new Date(currentWeekStart.getTime() - 7 * 86400000);
      const prevWeekEnd = new Date(currentWeekStart.getTime() - 1);
      const fourteenDaysAgoStr = toDateStr(new Date(Date.now() - 14 * 86400000));

      const commitsRes = await fetch(
        `${GITHUB_API}/search/commits?q=author:${session.githubLogin}+author-date:>=${fourteenDaysAgoStr}&per_page=100`,
        { headers: { Authorization: `Bearer ${session.accessToken}`, Accept: "application/vnd.github+json" }, cache: "no-store" }
      );
const commitsData = (await commitsRes.json()) as {
        items: Array<{
          commit: { author: { date: string } };
          repository: { full_name: string };
        }>;
      };

      let commitsThisWeek = 0;
      let commitsPrevWeek = 0;
      const activeDaysThisWeek = new Set<string>();
      const repoCounts = new Map<string, number>();

      for (const item of commitsData.items) {
        const commitDate = new Date(item.commit.author.date);

        if (commitDate >= currentWeekStart) {
          commitsThisWeek++;
          activeDaysThisWeek.add(item.commit.author.date.slice(0, 10));

          const repoName = item.repository.full_name;
          repoCounts.set(repoName, (repoCounts.get(repoName) ?? 0) + 1);
        } else if (commitDate >= prevWeekStart && commitDate <= prevWeekEnd) {
          commitsPrevWeek++;
        }
      }

      let topRepo: string | null = null;
      let topRepoCount = 0;
      Array.from(repoCounts.entries()).forEach(([repoName, count]) => {
        if (count > topRepoCount) {
          topRepo = repoName;
          topRepoCount = count;
        }
      });

      const prsRes = await fetch(
        `${GITHUB_API}/search/issues?q=type:pr+author:@me+created:>=${fourteenDaysAgoStr}&per_page=100`,
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            Accept: "application/vnd.github+json",
          },
          cache: "no-store",
        }
      );

      if (!prsRes.ok) {
        throw new Error("GitHub API error");
      }

      const prsData = (await prsRes.json()) as {
        items: Array<{
          created_at: string;
          state: string;
          pull_request?: { merged_at: string | null };
        }>;
      };

      let prsOpenedThisWeek = 0;
      let prsMergedThisWeek = 0;

      for (const item of prsData.items) {
        const createdAt = new Date(item.created_at);
        if (Number.isNaN(createdAt.getTime())) continue;
        if (createdAt >= currentWeekStart) {
          prsOpenedThisWeek++;
          if (item.pull_request?.merged_at != null) {
            prsMergedThisWeek++;
          }
        }
      }

      const streakDates = await fetchActiveDates(session.githubLogin!, session.accessToken!);
      const commitDelta = commitsThisWeek - commitsPrevWeek;

      return {
        commits: {
          current: commitsThisWeek,
          previous: commitsPrevWeek,
          delta: commitDelta,
          trend: commitDelta > 0 ? "up" : commitDelta < 0 ? "down" : "same",
        },
        prs: { opened: prsOpenedThisWeek, merged: prsMergedThisWeek },
        activeDays: activeDaysThisWeek.size,
        streak: calculateCurrentStreak(streakDates),
        topRepo,
      };
    });
    return Response.json(data);
  } catch {
    return Response.json({ error: "GitHub API error" }, { status: 502 });
  }
}
