import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveAppUser } from "@/lib/resolve-user";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.githubId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check Supabase config; if missing, return a safe fallback using session data
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.warn("Supabase env missing; returning session-based fallback profile");
    return Response.json({
      id: session.githubId,
      username: session.githubLogin ?? "",
      github_id: session.githubId,
      email: session.user?.email ?? null,
      avatar: session.user?.image ?? null,
      created_at: null,
      updated_at: null,
      connected_accounts: ["github"],
      note: "fallback: Supabase not configured",
    });
  }

  try {
    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("id, github_login, github_id, created_at, updated_at")
      .eq("github_id", session.githubId)
      .maybeSingle();

    if (error) {
      console.error("supabase error fetching user:", error);
      // fall through to GitHub fallback below
    }

    if (!user) {
      // try to fetch the user from GitHub using access token as a fallback
      const accessToken = session.accessToken as string | undefined;
      if (accessToken) {
        try {
          const ghResp = await fetch("https://api.github.com/user", {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (ghResp.ok) {
            const gh = await ghResp.json();
            return Response.json({
              id: gh.id?.toString() ?? session.githubId,
              username: gh.login ?? session.githubLogin ?? null,
              github_id: gh.id?.toString() ?? session.githubId,
              email: gh.email ?? session.user?.email ?? null,
              avatar: gh.avatar_url ?? session.user?.image ?? null,
              created_at: null,
              updated_at: null,
              connected_accounts: ["github"],
              note: "fetched from GitHub as Supabase record missing",
            });
          }
        } catch (ghErr) {
          console.error("GitHub fallback failed:", ghErr);
        }
      }

      // Return some session identifiers to help debugging (no tokens)
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    return Response.json({
      id: user.id,
      username: user.github_login,
      github_id: user.github_id,
      email: session.user?.email ?? null,
      avatar: session.user?.image ?? null,
      created_at: user.created_at,
      updated_at: user.updated_at,
      connected_accounts: ["github"],
    });
  } catch (err) {
    console.error("unexpected error in /api/user GET:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.githubId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await resolveAppUser(session.githubId, session.githubLogin);
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return Response.json({ error: "Account deletion unavailable: Supabase not configured on server" }, { status: 501 });
    }

    const tablesToDelete = [
      "streak_freezes",
      "streak_milestones",
      "local_coding_sessions",
      "local_coding_api_keys",
      "jira_credentials",
      "webhook_configs",
      "user_github_accounts",
      "goals",
      "metric_snapshots",
      "ai_insights",
    ] as const;

    for (const table of tablesToDelete) {
      const { error: tableError } = await supabaseAdmin
        .from(table)
        .delete()
        .eq("user_id", user.id);

      if (tableError) {
        console.error(`supabase error deleting ${table}:`, tableError);
        return Response.json(
          { error: `Failed to delete account data from ${table}`, detail: tableError.message },
          { status: 500 }
        );
      }
    }
    const { data, error } = await supabaseAdmin
      .from("users")
      .delete()
      .eq("id", user.id)
      .select("id");

    if (error) {
      console.error("supabase error deleting user:", error);
      return Response.json(
        { error: "Failed to delete account", detail: error.message },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return Response.json(
        { error: "Account not found or already deleted" },
        { status: 404 }
      );
    }

    return Response.json({ success: true, message: "Account deleted successfully" });
  } catch (err) {
    console.error("unexpected error in /api/user DELETE:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
