import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveAppUser } from "@/lib/resolve-user";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.githubId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  const user = await resolveAppUser(session.githubId, session.githubLogin);
  if (!user) return Response.json({ error: "User not found" }, { status: 404 });

  const { data: challenge, error: fetchError } = await supabaseAdmin
    .from("challenges")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !challenge) {
    return Response.json({ error: "Challenge not found" }, { status: 404 });
  }

  if (challenge.status !== "pending") {
    return Response.json({ error: "Challenge is no longer pending" }, { status: 400 });
  }

  if (challenge.creator_id === user.id) {
    return Response.json({ error: "You cannot accept your own challenge" }, { status: 400 });
  }

  const now = new Date();
  const end_time = new Date(now.getTime() + challenge.duration_days * 24 * 60 * 60 * 1000);

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("challenges")
    .update({
      opponent_id: user.id,
      status: "active",
      start_time: now.toISOString(),
      end_time: end_time.toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    console.error("Failed to accept challenge:", updateError);
    return Response.json({ error: "Failed to accept challenge" }, { status: 500 });
  }

  // Notify creator
  await supabaseAdmin
    .from("notifications")
    .insert({
      user_id: challenge.creator_id,
      type: "challenge_accepted",
      message: `${session.githubLogin} accepted your ${challenge.metric} challenge!`,
    });

  return Response.json({ challenge: updated });
}
