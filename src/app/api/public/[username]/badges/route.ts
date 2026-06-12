import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { BADGE_DEFINITIONS } from "@/lib/badges";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("github_login", username.toLowerCase())
    .maybeSingle();

  if (!user) {
    return Response.json({ badges: [] });
  }

  const { data: stored } = await supabaseAdmin
    .from("user_badges")
    .select("badge_key, earned_at")
    .eq("user_id", user.id)
    .order("earned_at", { ascending: true });

  const earnedMap = new Map(
    (stored ?? []).map((b: { badge_key: string; earned_at: string }) => [
      b.badge_key,
      b.earned_at,
    ]),
  );

  const badges = BADGE_DEFINITIONS.filter((def) => earnedMap.has(def.id)).map(
    (def) => ({
      id: def.id,
      name: def.name,
      emoji: def.emoji,
      description: def.description,
      earnedAt: earnedMap.get(def.id)!,
    }),
  );

  return Response.json({ badges });
}
