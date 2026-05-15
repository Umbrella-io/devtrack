import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const GITHUB_API = "https://api.github.com";

function dateDiffDays(a: string, b: string): number {
  return (
    (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24)
  );
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken || !session.githubLogin || !session.githubId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch 90 days to calculate a meaningful longest streak
  const since = new Date();
  since.setDate(since.getDate() - 90);
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

  if (!searchRes.ok) {
    return Response.json({ error: "GitHub API error" }, { status: 502 });
  }

  const data = (await searchRes.json()) as {
    items: Array<{ commit: { author: { date: string } } }>;
  };

  // Unique commit days
  const daySet: Record<string, true> = {};
  for (const item of data.items) {
    daySet[item.commit.author.date.slice(0, 10)] = true;
  }

  // Fetch the user's freeze dates from Supabase and merge them in as active days
  const { data: dbUser } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("github_id", session.githubId)
    .single();

  if (dbUser) {
    const { data: freezes } = await supabaseAdmin
      .from("streak_freezes")
      .select("freeze_date")
      .eq("user_id", dbUser.id)
      .gte("freeze_date", sinceStr);

    if (Array.isArray(freezes)) {
      for (const row of freezes) {
        daySet[row.freeze_date] = true;
      }
    }
  }

  const commitDays = Object.keys(daySet).sort();

  if (commitDays.length === 0) {
    return Response.json({ current: 0, longest: 0, lastCommitDate: null });
  }

  // Build streaks
  let longestStreak = 1;
  let currentRun = 1;
  const runs: { start: string; end: string; length: number }[] = [];
  let runStart = commitDays[0];

  for (let i = 1; i < commitDays.length; i++) {
    const diff = dateDiffDays(commitDays[i - 1], commitDays[i]);
    if (diff === 1) {
      currentRun++;
      if (currentRun > longestStreak) longestStreak = currentRun;
    } else {
      runs.push({ start: runStart, end: commitDays[i - 1], length: currentRun });
      runStart = commitDays[i];
      currentRun = 1;
    }
  }
  runs.push({ start: runStart, end: commitDays[commitDays.length - 1], length: currentRun });

  // Current streak: check if last commit day is today or yesterday
  const lastDay = commitDays[commitDays.length - 1];
  const today = toDateStr(new Date());
  const yesterday = toDateStr(new Date(Date.now() - 86400000));

  const lastRun = runs[runs.length - 1];
  const currentStreak =
    lastRun.end === today || lastRun.end === yesterday ? lastRun.length : 0;

  return Response.json({
    current: currentStreak,
    longest: longestStreak,
    lastCommitDate: lastDay,
    totalActiveDays: commitDays.length,
  });
}
