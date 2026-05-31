import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveAppUser } from "@/lib/resolve-user";
import { dispatchToAllWebhooks } from "@/lib/webhooks";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.githubId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await resolveAppUser(session.githubId, session.githubLogin);
  if (!user) return Response.json({ error: "User not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const { current } = body;

  if (typeof current !== "number" || current < 0) {
    return Response.json(
      { error: "Invalid current value" },
      { status: 400 }
    );
  }

  const { data: existingGoal } = await supabaseAdmin
    .from("goals")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!existingGoal) {
    return Response.json({ error: "Goal not found" }, { status: 404 });
  }

  const wasCompleted = existingGoal.current >= existingGoal.target;
  const { data: updatedGoal, error } = await supabaseAdmin
    .from("goals")
    .update({ current })
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return Response.json(
      { error: "Failed to update goal" },
      { status: 500 }
    );
  }

  const isNowCompleted = updatedGoal.current >= updatedGoal.target;

  if (!wasCompleted && isNowCompleted) {
    dispatchToAllWebhooks(user.id, "goal.completed", {
      goalId: updatedGoal.id,
      title: updatedGoal.title,
      target: updatedGoal.target,
      unit: updatedGoal.unit,
      recurrence: updatedGoal.recurrence,
      completedAt: new Date().toISOString(),
    }).catch(() => {});
  }

  return Response.json({ goal: updatedGoal });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.githubId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await resolveAppUser(session.githubId, session.githubLogin);
    if (!user) {
      console.error("Failed to resolve user for goals DELETE:", {
        githubId: session.githubId,
      });
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Only delete if the goal belongs to the authenticated user
    const { error } = await supabaseAdmin
      .from("goals")
      .delete()
      .eq("id", params.id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting goal:", error);
      return Response.json({ error: "Failed to delete goal" }, { status: 500 });
    }

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in goals DELETE:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
