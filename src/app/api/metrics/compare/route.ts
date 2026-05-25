import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";
import { dateDiffDays, toDateStr } from "@/lib/dateUtils";
import { normalizeGitHubUsername } from "@/lib/validate-github-username";

export const dynamic = "force-dynamic";

const GITHUB_API = "https://api.github.com";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
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

  const encodedUsername = encodeURIComponent(normalizedUsername);

  // 1. Verify user exists
  const userRes = await fetch(`${GITHUB_API}/users/${encodedUsername}`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    cache: "no-store",
  });

  if (!userRes.ok) {
    if (userRes.status === 404) return Response.json({ error: "User not found" }, { status: 404 });
    return Response.json({ error: "GitHub API error or User is private" }, { status: 502 });
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
  
  if (commitsRes.ok) {
    const commitsData = await commitsRes.json();
    const items = commitsData.items || [];
    
    const daySet: Record<string, true> = {};
    for (const item of items) {
      const dateStr = item.commit.author.date.slice(0, 10);
      daySet[dateStr] = true;
      if (dateStr >= since30Str) {
        commits30d++;
      }
    }
    const commitDays = Object.keys(daySet).sort();
    
    if (commitDays.length > 0) {
      let currentRun = 1;
      let runs: { end: string; length: number }[] = [];
      let runStart = commitDays[0];
      for (let i = 1; i < commitDays.length; i++) {
        if (dateDiffDays(commitDays[i - 1], commitDays[i]) === 1) {
          currentRun++;
        } else {
          runs.push({ end: commitDays[i - 1], length: currentRun });
          runStart = commitDays[i];
          currentRun = 1;
        }
      }
      runs.push({ end: commitDays[commitDays.length - 1], length: currentRun });
      
      const today = toDateStr(new Date());
      const yesterday = toDateStr(new Date(Date.now() - 86400000));
      const lastRun = runs[runs.length - 1];
      streak = (lastRun.end === today || lastRun.end === yesterday) ? lastRun.length : 0;
    }
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
    const reposData = await reposRes.json();
    const langCounts: Record<string, number> = {};
    for (const repo of reposData) {
      if (repo.language) {
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

  return Response.json({
    username: normalizedUsername,
    streak,
    commits30d,
    topLanguage,
    prs
  });
}
