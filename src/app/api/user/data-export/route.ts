import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveAppUser } from "@/lib/resolve-user";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.githubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await resolveAppUser(session.githubId, session.githubLogin);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const sections: Record<string, unknown> = {};

  const { data: userData } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();
  if (userData) {
    sections.user = {
      githubLogin: userData.github_login,
      isPublic: userData.is_public,
      leaderboardOptIn: userData.leaderboard_opt_in,
      createdAt: userData.created_at,
    };
  }

  const { data: goals } = await supabaseAdmin
    .from("goals")
    .select("*")
    .eq("user_id", user.id);
  sections.goals = goals || [];

  const { data: snapshots } = await supabaseAdmin
    .from("metric_snapshots")
    .select("*")
    .eq("user_id", user.id)
    .order("snapshot_at", { ascending: false })
    .limit(1000);
  sections.metricSnapshots = snapshots || [];

  const { data: webhooks } = await supabaseAdmin
    .from("webhook_configs")
    .select("id, name, url, events, is_enabled, created_at")
    .eq("user_id", user.id);
  sections.webhooks = webhooks || [];

  const webhookIds = webhooks?.map((w) => w.id) || [];
  const { data: webhookDeliveries } = await supabaseAdmin
    .from("webhook_deliveries")
    .select("*")
    .in("webhook_id", webhookIds);
  sections.webhookDeliveries = webhookDeliveries || [];

  const { data: streakFreezes } = await supabaseAdmin
    .from("streak_freezes")
    .select("*")
    .eq("user_id", user.id);
  sections.streakFreezes = streakFreezes || [];

  const { data: streakMilestones } = await supabaseAdmin
    .from("streak_milestones")
    .select("*")
    .eq("user_id", user.id);
  sections.streakMilestones = streakMilestones || [];

  const { data: linkedAccounts } = await supabaseAdmin
    .from("user_github_accounts")
    .select("id, user_id, github_id, github_login, created_at")
    .eq("user_id", user.id);
  sections.linkedAccounts = linkedAccounts || [];

  const { data: localCodingSessions } = await supabaseAdmin
    .from("local_coding_sessions")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .limit(365);
  sections.localCodingSessions = localCodingSessions || [];

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    userId: user.id,
    githubLogin: session.githubLogin,
    sections,
  });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.githubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await resolveAppUser(session.githubId, session.githubLogin);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const { confirmText } = body;

  if (confirmText !== "DELETE") {
    return NextResponse.json(
      { error: "Please type DELETE to confirm account deletion" },
      { status: 400 }
    );
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
  ];

  for (const table of tablesToDelete) {
    await supabaseAdmin.from(table).delete().eq("user_id", user.id);
  }

  await supabaseAdmin.from("users").delete().eq("id", user.id);

  const response = NextResponse.json({
    success: true,
    message: "All user data has been deleted. You will be signed out.",
  });

  const useSecureCookies = process.env.NODE_ENV === "production";
  const sessionTokenCookieName = useSecureCookies
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token";

  response.cookies.set({
    name: sessionTokenCookieName,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: useSecureCookies,
    path: "/",
    expires: new Date(0),
  });

  return response;
}
