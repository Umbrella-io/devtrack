import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveAppUser } from "@/lib/resolve-user";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { githubId: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.githubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!params.githubId || typeof params.githubId !== "string" || !/^\d+$/.test(params.githubId)) {
    return NextResponse.json({ error: "Invalid githubId parameter" }, { status: 400 });
  }

  const userRow = await resolveAppUser(session.githubId, session.githubLogin);

  if (!userRow) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (params.githubId === session.githubId) {
    return NextResponse.json(
      { error: "Cannot remove primary account" },
      { status: 400 }
    );
  }

  const { data: deletedRows, error } = await supabaseAdmin
    .from("user_github_accounts")
    .delete()
    .eq("user_id", userRow.id)
    .eq("github_id", params.githubId)
    .select("github_id");

  if (error) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }

  if (!deletedRows || deletedRows.length === 0) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
