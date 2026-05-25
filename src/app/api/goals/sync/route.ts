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
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken || !session.githubId || !session.githubLogin) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── 1. Fetch user from DB ─────────────────────────────────────────────────
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("github_id", session.githubId)
      .single();

    if (userError) {
      console.error("Error fetching user for goals sync:", {
        githubId: session.githubId,
        errorCode: userError.code,
        errorMessage: userError.message,
      });
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    if (!user) {
      console.error("User returned null for goals sync:", {
        githubId: session.githubId,
      });
      return Response.json({ error: "User not found" }, { status: 404 });
    }

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
      console.error("Error fetching goals for sync:", {
        userId: user.id,
        errorCode: goalsError.code,
        errorMessage: goalsError.message,
      });
      return Response.json({ error: "Failed to fetch goals" }, { status: 500 });
    }

    if (!commitGoals || commitGoals.length === 0) {
      return Response.json({ updated: 0, commitCount: 0 });
    }

    // ── 3. Count commits for the current week from GitHub ────────────────────
    let ghRes: Response;
    try {
      ghRes = await fetch(
        `${GITHUB_API}/search/commits?q=author:${session.githubLogin}+author-date:${weekStart}..${weekEnd}&per_page=100`,
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            Accept: "application/vnd.github.cloak-preview+json",
          },
          cache: "no-store",
        }
      );
    } catch (fetchErr) {
      console.error("Error fetching from GitHub API:", {
        githubLogin: session.githubLogin,
        error: fetchErr instanceof Error ? fetchErr.message : String(fetchErr),
      });
      return Response.json(
        { error: "Failed to contact GitHub API" },
        { status: 502 }
      );
    }

    if (!ghRes.ok) {
      let ghErrorBody: any = {};
      try {
        ghErrorBody = await ghRes.json();
      } catch {
        // Could not parse error response
      }

      console.error("GitHub API returned non-OK status:", {
        status: ghRes.status,
        statusText: ghRes.statusText,
        githubLogin: session.githubLogin,
        message: ghErrorBody.message,
        documentation_url: ghErrorBody.documentation_url,
      });

      // 403 usually means token scope or rate limit
      if (ghRes.status === 403) {
        return Response.json(
          {
            error: "GitHub API access denied. Check token scopes or rate limits.",
            details: ghErrorBody.message || "Forbidden",
          },
          { status: 403 }
        );
      }

      return Response.json({ error: "GitHub API error" }, { status: 502 });
    }

    let ghData: { total_count: number };
    try {
      ghData = (await ghRes.json()) as { total_count: number };
    } catch (parseErr) {
      console.error("Error parsing GitHub API response:", {
        error: parseErr instanceof Error ? parseErr.message : String(parseErr),
      });
      return Response.json(
        { error: "Invalid GitHub API response" },
        { status: 502 }
      );
    }

    const commitCount = ghData.total_count || 0;

    // ── 4. Update all commit-based goals with the real commit count ───────────
    const now = new Date().toISOString();
    const ids = commitGoals.map((g) => g.id);

    const { error: updateError } = await supabaseAdmin
      .from("goals")
      .update({ current: commitCount, last_synced_at: now })
      .in("id", ids);

    if (updateError) {
      console.error("Error updating goals after sync:", {
        userId: user.id,
        goalsCount: ids.length,
        errorCode: updateError.code,
        errorMessage: updateError.message,
      });
      return Response.json({ error: "Failed to update goals" }, { status: 500 });
    }

    return Response.json({ updated: ids.length, commitCount });
  } catch (error) {
    console.error("Unexpected error in goals sync POST:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
