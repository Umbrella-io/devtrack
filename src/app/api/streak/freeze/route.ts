import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// GET /api/streak/freeze
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

// POST /api/streak/freeze
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

  const { data: freeze, error } = await supabaseAdmin
    .from("streak_freezes")
    .insert({ user_id: user.id, freeze_date: today })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return Response.json(
        { error: "You already have an unused streak freeze." },
        { status: 409 }
      );
    }
    return Response.json({ error: "Failed to apply freeze." }, { status: 500 });
  }

  return Response.json({ freeze }, { status: 201 });
}

// DELETE /api/streak/freeze
// Removes today's active freeze for the authenticated user.
export async function DELETE() {
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

  const { error } = await supabaseAdmin
    .from("streak_freezes")
    .delete()
    .eq("user_id", user.id)
    .eq("freeze_date", todayStr());

  if (error) return Response.json({ error: "Failed to cancel freeze" }, { status: 500 });

  return Response.json({ success: true });
}
