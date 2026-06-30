import { getServerAuthSession } from "@/lib/server-auth";
import { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";
import { toDateStr } from "@/lib/date-utils";
import { calculateCurrentStreak } from "@/lib/streak";
import { normalizeGitHubUsername } from "@/lib/validate-github-username";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const GITHUB_API = "https://api.github.com";

export async function GET(req: NextRequest) {
  const session = await getServerAuthSession();
  if (!session?.accessToken || !session.githubLogin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const usernameParam = req.nextUrl.searchParams.get("username");
  if (!usernameParam) {
    return Response.json({ error: "Username required" }, { status: 400 });
  }

  let username = usernameParam.trim();
  if (username.length === 0) {
    return Response.json({ error: "Username required" }, { status: 400 });
  }

  if (username === "me") {
    username = session.githubLogin as string;
  }

  const normalizedUsername = normalizeGitHubUsername(username);
  if (!normalizedUsername) {
    return Response.json({ error: "Invalid GitHub username" }, { status: 400 });
  }

  // Check Supabase cache first (keyed by viewer identity + target username + UTC date)
  // Viewer identity must be part of the key because GitHub API results are token-scoped
  // (private/org repos can differ per viewer), so one user's cached payload must not
  // be served to a different authenticated user.
  // Use githubId (stable numeric ID) with githubLogin as fallback.
  const today = toDateStr(new Date());
  const viewerId = session.githubId ?? session.githubLogin;
  const cacheKey = `${viewerId}::${normalizedUsername}::${today}`;

  const { data: cached } = await supabaseAdmin
    .from("comparison_cache")
    .select("payload")
    .eq("cache_key", cacheKey)
    .maybeSingle();

  if (cached?.payload) {
    return Response.json({ ...cached.payload, fromCache: true });
  }

  const encodedUsername = encodeURIComponent(normalizedUsername);

  // 1. Verify user exists
  const userRes = await fetch(`${GITHUB_API}/users/${encodedUsername}`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    cache: "no-store",
  });

  if (!userRes.ok) {
    if (userRes.status === 404)
      return Response.json({ error: "User not found" }, { status: 404 });
    return Response.json(
      { error: "GitHub API error or User is private" },
      { status: 502 }
    );
  }

  // 2. Commits & Streak (fetch 90 days)
  const since90 = new Date();
  since90.setDate(since90.getDate() - 90);
  const since90Str = since90.toISOString().slice(0, 10);

  const since30 = new Date();
  since30.setDate(since30.getDate() - 30);
  const since30Str = since30.toISOString().slice(0, 10);

  const commitsUrl = new URL(`${GITHUB_API}/search/commits`);
  commitsUrl.searchParams.set(
    "q",
    `author:${normalizedUsername} author-date:>=${since90Str}`
  );
  commitsUrl.searchParams.set("per_page", "100");
  commitsUrl.searchParams.set("sort", "author-date");
  commitsUrl.searchParams.set("order", "desc");

  const commitsRes = await fetch(commitsUrl.toString(), {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      Accept: "application/vnd.github+json",
    },
    cache: "no-store",
  });

  let streak = 0;
  let commits30d = 0;
  let topLanguage = "Unknown";
  const weeklyMap: Record<string, number> = {};

  if (commitsRes.ok) {
    const commitsData = await commitsRes.json();
    const items: Array<{ commit: { author: { date: string } } }> =
      commitsData.items || [];

    const daySet: Record<string, true> = {};
    for (const item of items) {
      const dateStr = item.commit.author.date.slice(0, 10);
      daySet[dateStr] = true;
      if (dateStr >= since30Str) {
        commits30d++;
      }

      // Bucket into Mon-anchored week for chart
      const d = new Date(dateStr);
      const day = d.getUTCDay();
      const diff = day === 0 ? -6 : 1 - day;
      d.setUTCDate(d.getUTCDate() + diff);
      const weekKey = toDateStr(d);
      weeklyMap[weekKey] = (weeklyMap[weekKey] ?? 0) + 1;
    }

    streak = calculateCurrentStreak(Object.keys(daySet));
  }

  // Build ordered weekly array (last 8 weeks) for the chart
  const weeklyCommits: Array<{ week: string; commits: number }> = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date();
    const day = d.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setUTCDate(d.getUTCDate() + diff - i * 7);
    const weekKey = toDateStr(d);
    weeklyCommits.push({ week: weekKey, commits: weeklyMap[weekKey] ?? 0 });
  }

  // 3. Top Language from repos
  const reposUrl = new URL(`${GITHUB_API}/users/${encodedUsername}/repos`);
  reposUrl.searchParams.set("per_page", "100");
  reposUrl.searchParams.set("sort", "pushed");

  const reposRes = await fetch(reposUrl.toString(), {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    cache: "no-store",
  });

  if (reposRes.ok) {
    const reposData: Array<{ language: string | null; fork: boolean }> =
      await reposRes.json();
    const langCounts: Record<string, number> = {};
    for (const repo of reposData) {
      if (!repo.fork && repo.language) {
        langCounts[repo.language] = (langCounts[repo.language] || 0) + 1;
      }
    }
    const sortedLangs = Object.entries(langCounts).sort((a, b) => b[1] - a[1]);
    if (sortedLangs.length > 0) topLanguage = sortedLangs[0][0];
  }

  // 4. PRs
  const prsUrl = new URL(`${GITHUB_API}/search/issues`);
  prsUrl.searchParams.set("q", `type:pr author:${normalizedUsername}`);
  prsUrl.searchParams.set("per_page", "1");

  const prsRes = await fetch(prsUrl.toString(), {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    cache: "no-store",
  });
  let prs = 0;
  if (prsRes.ok) {
    const prsData = await prsRes.json();
    prs = prsData.total_count || 0;
  }

  const payload = {
    username: normalizedUsername,
    streak,
    commits30d,
    topLanguage,
    prs,
    weeklyCommits,
  };

  // Store in cache — best-effort, never fail the request over this
  void supabaseAdmin
    .from("comparison_cache")
    .upsert({
      cache_key: cacheKey,
      target_username: normalizedUsername,
      payload,
    });

  return Response.json({ ...payload, fromCache: false });
}
