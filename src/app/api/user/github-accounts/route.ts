import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.githubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("github_id", session.githubId)
    .single();

  if (!userRow) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: accounts, error } = await supabaseAdmin
    .from("user_github_accounts")
    .select("id, github_id, github_login, added_at")
    .eq("user_id", userRow.id)
    .order("added_at", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch accounts" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    accounts: (accounts ?? []).map((account) => ({
      id: account.id,
      githubId: account.github_id,
      githubLogin: account.github_login,
      addedAt: account.added_at,
    })),
  });
}
