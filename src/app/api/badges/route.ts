import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveAppUser } from "@/lib/resolve-user";
import { GITHUB_API } from "@/lib/github";
import {
  isMetricsCacheBypassed,
  METRICS_CACHE_TTL_SECONDS,
  metricsCacheKey,
  withMetricsCache,
} from "@/lib/metrics-cache";
import {
  BADGE_DEFINITIONS,
  type BadgeStats,
  computeEarnedBadgeKeys,
  computeBadgeProgress,
} from "@/lib/badges";

export const dynamic = "force-dynamic";

interface GitHubCommitSearchResponse {
  total_count: number;
  items: Array<{ commit: { author: { date: string } } }>;
}

interface GitHubRepo {
  stargazers_count: number;
}

async function fetchCommitStats(
  login: string,
  token: string,
  cacheContext: { bypass: boolean; userId: string },
): Promise<{ totalCommits: number; streak: number; nightCommits: number; earlyCommits: number }> {
  const key = metricsCacheKey(cacheContext.userId, "badge-commit-stats", {});
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
  };

  return withMetricsCache(
    { bypass: cacheContext.bypass, key, ttlSeconds: METRICS_CACHE_TTL_SECONDS.streak },
    async () => {
      // All-time total commits (per_page=1 to only fetch the count)
      const totalRes = await fetch(
        `${GITHUB_API}/search/commits?q=author:${login}+author-date:>=2008-01-01&per_page=1`,
        { headers, cache: "no-store" },
      );
      const totalData: GitHubCommitSearchResponse = totalRes.ok
        ? await totalRes.json()
        : { total_count: 0, items: [] };

      // Recent commits (365 days) for streak + hour analysis
      const since = new Date();
      since.setDate(since.getDate() - 365);
      const sinceStr = since.toISOString().slice(0, 10);

      const activeDates = new Set<string>();
      let nightCommits = 0;
      let earlyCommits = 0;

      for (let page = 1; page <= 10; page++) {
        const res = await fetch(
          `${GITHUB_API}/search/commits?q=author:${login}+author-date:>=${sinceStr}&per_page=100&page=${page}&sort=author-date&order=desc`,
          { headers, cache: "no-store" },
        );
        if (!res.ok) break;
        const data: GitHubCommitSearchResponse = await res.json();

        for (const item of data.items) {
          const d = new Date(item.commit.author.date);
          activeDates.add(d.toISOString().slice(0, 10));
          const hour = d.getHours();
          if (hour >= 0 && hour <= 3) nightCommits++;
          if (hour <= 6) earlyCommits++;
        }

        if (data.items.length < 100) break;
      }

      // Compute streak from sorted dates
      const sorted = Array.from(activeDates).sort().reverse();
      let streak = 0;

      if (sorted.length > 0) {
        const today = new Date().toISOString().slice(0, 10);
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

        if (sorted[0] === today || sorted[0] === yesterday) {
          streak = 1;
          for (let i = 1; i < sorted.length; i++) {
            const prev = new Date(sorted[i - 1]);
            const curr = new Date(sorted[i]);
            const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86400000);
            if (diffDays === 1) {
              streak++;
            } else {
              break;
            }
          }
        }
      }

      return { totalCommits: totalData.total_count, streak, nightCommits, earlyCommits };
    },
  );
}

async function fetchMergedPRCount(
  login: string,
  token: string,
  cacheContext: { bypass: boolean; userId: string },
): Promise<number> {
  const key = metricsCacheKey(cacheContext.userId, "badge-merged-prs", {});

  return withMetricsCache(
    { bypass: cacheContext.bypass, key, ttlSeconds: METRICS_CACHE_TTL_SECONDS.contributions },
    async () => {
      const res = await fetch(
        `${GITHUB_API}/search/issues?q=author:${login}+type:pr+is:merged&per_page=1`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
          },
          cache: "no-store",
        },
      );
      if (!res.ok) return 0;
      const data: { total_count: number } = await res.json();
      return data.total_count;
    },
  );
}

async function fetchTotalStars(
  token: string,
  cacheContext: { bypass: boolean; userId: string },
): Promise<number> {
  const key = metricsCacheKey(cacheContext.userId, "badge-total-stars", {});

  return withMetricsCache(
    { bypass: cacheContext.bypass, key, ttlSeconds: METRICS_CACHE_TTL_SECONDS.contributions },
    async () => {
      let total = 0;
      let page = 1;

      while (page <= 3) {
        const res = await fetch(
          `${GITHUB_API}/user/repos?per_page=100&page=${page}&type=owner&sort=updated`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/vnd.github+json",
            },
            cache: "no-store",
          },
        );
        if (!res.ok) break;
        const repos: GitHubRepo[] = await res.json();
        for (const repo of repos) total += repo.stargazers_count;
        if (repos.length < 100) break;
        page++;
      }

      return total;
    },
  );
}

async function fetchHasUsedFreeze(userId: string): Promise<boolean> {
  const { count } = await supabaseAdmin
    .from("streak_freezes")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  return (count ?? 0) > 0;
}

async function syncUserBadges(userId: string, earnedKeys: string[]): Promise<void> {
  if (earnedKeys.length === 0) return;

  const { data: existing } = await supabaseAdmin
    .from("user_badges")
    .select("badge_key")
    .eq("user_id", userId);

  const existingSet = new Set(
    (existing ?? []).map((r: { badge_key: string }) => r.badge_key),
  );
  const newKeys = earnedKeys.filter((k) => !existingSet.has(k));
  if (newKeys.length === 0) return;

  await supabaseAdmin.from("user_badges").insert(
    newKeys.map((badge_key) => ({
      user_id: userId,
      badge_key,
      earned_at: new Date().toISOString(),
    })),
  );
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken || !session.githubId || !session.githubLogin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await resolveAppUser(session.githubId, session.githubLogin);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bypass = isMetricsCacheBypassed(req);
  const cacheContext = { bypass, userId: user.id };

  const [commitsResult, prsResult, starsResult, freezeResult] =
    await Promise.allSettled([
      fetchCommitStats(session.githubLogin, session.accessToken, cacheContext),
      fetchMergedPRCount(session.githubLogin, session.accessToken, cacheContext),
      fetchTotalStars(session.accessToken, cacheContext),
      fetchHasUsedFreeze(user.id),
    ]);

  const commitStats =
    commitsResult.status === "fulfilled"
      ? commitsResult.value
      : { totalCommits: 0, streak: 0, nightCommits: 0, earlyCommits: 0 };
  const mergedPRs = prsResult.status === "fulfilled" ? prsResult.value : 0;
  const totalStars = starsResult.status === "fulfilled" ? starsResult.value : 0;
  const hasUsedFreeze = freezeResult.status === "fulfilled" ? freezeResult.value : false;

  const stats: BadgeStats = {
    streak: commitStats.streak,
    totalCommits: commitStats.totalCommits,
    nightCommits: commitStats.nightCommits,
    earlyCommits: commitStats.earlyCommits,
    mergedPRs,
    totalStars,
    hasUsedFreeze,
  };

  const earnedKeys = computeEarnedBadgeKeys(stats);
  const progress = computeBadgeProgress(stats);

  // Persist newly earned badges (idempotent — existing earned_at preserved)
  await syncUserBadges(user.id, earnedKeys);

  // Re-fetch stored badges to get original earned_at timestamps
  const { data: storedBadges } = await supabaseAdmin
    .from("user_badges")
    .select("badge_key, earned_at")
    .eq("user_id", user.id);

  const earnedMap = new Map(
    (storedBadges ?? []).map((b: { badge_key: string; earned_at: string }) => [
      b.badge_key,
      b.earned_at,
    ]),
  );

  interface BadgeResponseItem {
    id: string;
    name: string;
    emoji: string;
    description: string;
    earned: boolean;
    earnedAt: string | null;
    progress: { current: number; total: number } | null;
    unlockCondition: string;
  }

  const earned: BadgeResponseItem[] = [];
  const locked: BadgeResponseItem[] = [];

  for (const def of BADGE_DEFINITIONS) {
    const earnedAt = earnedMap.get(def.id) ?? null;
    const badgeProgress = progress[def.id] ?? null;

    const badge = {
      id: def.id,
      name: def.name,
      emoji: def.emoji,
      description: def.description,
      earned: earnedAt !== null,
      earnedAt,
      progress: badgeProgress,
      unlockCondition: def.unlockCondition,
    };

    if (earnedAt !== null) {
      earned.push(badge);
    } else {
      locked.push(badge);
    }
  }

  return Response.json({ earned, locked });
}
