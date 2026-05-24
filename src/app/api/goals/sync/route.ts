import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * Returns Monday 00:00:00 local time of the current week as a full ISO string.
 *
 * Fix for Bug 2 (Sunday + timezone):
 * - Uses `const diff = day === 0 ? -6 : 1 - day` so Sunday correctly resolves
 *   to the *previous* Monday, not the *next* one.
 * - Returns a full ISO timestamp instead of `.slice(0, 10)` to avoid the UTC
 *   date-shift bug (matching the approach already used in `getPeriodStart()`).
 */
function currentWeekStart(): string {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday = 0 offset; Sunday = -6
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday.toISOString();
}

/** Returns Sunday 23:59:59.999 of the current week as a full ISO string. */
function currentWeekEnd(): string {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? 0 : 7 - day; // Sunday of this week
  const sunday = new Date(now);
  sunday.setUTCDate(now.getUTCDate() + diff);
  sunday.setUTCHours(23, 59, 59, 999);
  return sunday.toISOString();
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

  const weekStart = currentWeekStart();
  const weekEnd = currentWeekEnd();

  // ── 2. Fetch all commit-based goals for this week ─────────────────────────
  // Fix for Bug 1: column is `period_start` (full ISO timestamp), not `week_start`.
  // Use a range filter (.gte / .lte) instead of string equality.
  const { data: commitGoals, error: goalsError } = await supabaseAdmin
    .from("goals")
    .select("id")
    .eq("user_id", user.id)
    .eq("unit", "commits")
    .gte("period_start", weekStart)
    .lte("period_start", weekEnd);

  if (goalsError) {
    return Response.json({ error: "Failed to fetch goals" }, { status: 500 });
  }

  if (!commitGoals || commitGoals.length === 0) {
    return Response.json({ updated: 0, commitCount: 0 });
  }

  // ── 3. Count commits for the current week from GitHub ────────────────────
  const ghRes = await fetch(
    `${GITHUB_API}/search/commits?q=author:${session.githubLogin}+author-date:${weekStart}..${weekEnd}&per_page=100`,
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
