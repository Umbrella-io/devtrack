import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { githubId: string } }
) {
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
