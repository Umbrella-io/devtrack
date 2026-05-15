import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

async function getUserId(githubId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("github_id", githubId)
    .single();
  return data?.id ?? null;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.githubId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = await getUserId(session.githubId);
  if (!userId) return Response.json({ error: "User not found" }, { status: 404 });

  const { data } = await supabaseAdmin
    .from("streak_freezes")
    .select("id")
    .eq("user_id", userId)
    .eq("freeze_date", todayStr())
    .maybeSingle();

  return Response.json({ hasFreeze: data !== null });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.githubId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = await getUserId(session.githubId);
  if (!userId) return Response.json({ error: "User not found" }, { status: 404 });

  const { error } = await supabaseAdmin
    .from("streak_freezes")
    .delete()
    .eq("user_id", userId)
    .eq("freeze_date", todayStr());

  if (error) return Response.json({ error: "Failed to cancel freeze" }, { status: 500 });

  return Response.json({ success: true });
}
