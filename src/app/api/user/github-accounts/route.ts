import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveAppUser } from "@/lib/resolve-user";

export const dynamic = "force-dynamic";

interface LinkedAccount {
  id: string;
  github_id: string;
  github_login: string;
  added_at: string;
}


export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.githubId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRow = await resolveAppUser(session.githubId, session.githubLogin);

    if (!userRow) {
      console.error("Failed to resolve user for github-accounts GET:", {
        githubId: session.githubId,
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: accounts, error } = await supabaseAdmin
      .from("user_github_accounts")
      .select("id, github_id, github_login, added_at")
      .eq("user_id", userRow.id)
      .order("added_at", { ascending: true });

    if (error) {
      console.error("Error fetching GitHub accounts:", error);
      return NextResponse.json(
        { error: "Failed to fetch accounts" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      accounts: (accounts ?? []).map((account: LinkedAccount) => ({
        id: account.id,
        githubId: account.github_id,
        githubLogin: account.github_login,
        addedAt: account.added_at,
      })),
    });
  } catch (error) {
    console.error("Unexpected error in github-accounts GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
