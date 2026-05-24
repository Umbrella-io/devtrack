import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveAppUser } from "@/lib/resolve-user";

export const dynamic = "force-dynamic";

/** Dev-only debug endpoint — remove before production release */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.githubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await resolveAppUser(session.githubId, session.githubLogin);
  if (!user) {
    return NextResponse.json({ error: "resolveAppUser returned null" }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, github_id, github_login, is_public, leaderboard_opt_in, created_at, updated_at")
    .eq("id", user.id)
    .single();

  return NextResponse.json({
    session: {
      githubId: session.githubId,
      githubLogin: session.githubLogin,
    },
    dbRow: data,
    dbError: error,
    publicProfileUrl: `/u/${data?.github_login}`,
    lookupWouldMatch: data?.is_public === true && !!data?.github_login,
  });
}
