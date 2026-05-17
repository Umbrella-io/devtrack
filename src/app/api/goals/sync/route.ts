import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/** Returns Monday of the current week as "YYYY-MM-DD" */
function currentWeekStart(): string {
  const now = new Date();
  const d = new Date(now);
  d.setDate(now.getDate() - now.getDay() + 1); // Monday
  return d.toISOString().slice(0, 10);
}

/** Returns Sunday 23:59:59 of the current week as an ISO string */
function currentWeekEnd(): string {
  const now = new Date();
  const d = new Date(now);
  d.setDate(now.getDate() - now.getDay() + 7); // Sunday
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

const GITHUB_API = "https://api.github.com";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken || !session.githubId || !session.githubLogin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 1. Fetch user from DB ─────────────────────────────────────────────────
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("github_id", session.githubId)
    .single();

  if (!user) return Response.json({ error: "User not found" }, { status: 404 });

  // ── 2. Fetch all commit-based goals for this week ─────────────────────────
  const { data: commitGoals, error: goalsError } = await supabaseAdmin
    .from("goals")
    .select("id")
    .eq("user_id", user.id)
    .eq("week_start", currentWeekStart())
    .eq("unit", "commits");

  if (goalsError) {
    return Response.json({ error: "Failed to fetch goals" }, { status: 500 });
  }

  if (!commitGoals || commitGoals.length === 0) {
    return Response.json({ updated: 0, commitCount: 0 });
  }

  // ── 3. Count commits for the current week from GitHub ────────────────────
  const since = `${currentWeekStart()}T00:00:00Z`;
  const until = currentWeekEnd();

  const ghRes = await fetch(
    `${GITHUB_API}/search/commits?q=author:${session.githubLogin}+author-date:${since}..${until}&per_page=100`,
    {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        Accept: "application/vnd.github+json",
      },
      cache: "no-store",
    }
  );

  if (!ghRes.ok) {
    return Response.json({ error: "GitHub API error" }, { status: 502 });
  }

  const ghData = (await ghRes.json()) as { total_count: number };
  const commitCount = ghData.total_count;

  // ── 4. Update all commit-based goals with the real commit count ───────────
  const now = new Date().toISOString();
  const ids = commitGoals.map((g) => g.id);

  const { error: updateError } = await supabaseAdmin
    .from("goals")
    .update({ current: commitCount, last_synced_at: now })
    .in("id", ids);

  if (updateError) {
    return Response.json({ error: "Failed to update goals" }, { status: 500 });
  }

  return Response.json({ updated: ids.length, commitCount });
}
