import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// Returns whether the user currently has an unused freeze available.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.githubId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("github_id", session.githubId)
    .single();

  if (!user) return Response.json({ error: "User not found" }, { status: 404 });

  const today = todayStr();

  const { data: pending } = await supabaseAdmin
    .from("streak_freezes")
    .select("id, freeze_date")
    .eq("user_id", user.id)
    .gte("freeze_date", today)
    .limit(1);

  const hasFreeze = Array.isArray(pending) && pending.length > 0;

  return Response.json({ hasFreeze, freezeDate: hasFreeze ? pending![0].freeze_date : null });
}
// Inserts a freeze for today. Fails if the user already holds an unused freeze.
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.githubId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("github_id", session.githubId)
    .single();

  if (!user) return Response.json({ error: "User not found" }, { status: 404 });

  const today = todayStr();

  // only 1 unused freeze at a time
  const { data: existing } = await supabaseAdmin
    .from("streak_freezes")
    .select("id")
    .eq("user_id", user.id)
    .gte("freeze_date", today)
    .limit(1);

  if (Array.isArray(existing) && existing.length > 0) {
    return Response.json(
      { error: "You already have an unused streak freeze." },
      { status: 409 }
    );
  }

  const { data: freeze, error } = await supabaseAdmin
    .from("streak_freezes")
    .insert({ user_id: user.id, freeze_date: today })
    .select()
    .single();

  if (error) {
    return Response.json({ error: "Failed to apply freeze." }, { status: 500 });
  }

  return Response.json({ freeze }, { status: 201 });
}