import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveAppUser } from "@/lib/resolve-user";
import { dispatchToAllWebhooks } from "@/lib/webhooks";

export const dynamic = "force-dynamic";

// Goals whose progress is derived from verified GitHub activity.
// The sync endpoint (/api/goals/sync) is the sole authority for these values;
// client-supplied progress updates must be rejected to prevent fabrication.
const ACTIVITY_DERIVED_UNITS = new Set(["commits", "prs"]);

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.githubId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await resolveAppUser(session.githubId, session.githubLogin);
  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { title, target, unit, recurrence, current } = body;

  const { data: existingGoal } = await supabaseAdmin
    .from("goals")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!existingGoal) {
    return Response.json({ error: "Goal not found" }, { status: 404 });
  }

  // Block manual updates for derived goals
  if (ACTIVITY_DERIVED_UNITS.has(existingGoal.unit)) {
    return Response.json(
      {
        error:
          "Progress for activity-derived goals is updated automatically via GitHub sync.",
      },
      { status: 422 }
    );
  }

  const updates: Record<string, unknown> = {};

  if (title !== undefined) {
    if (typeof title !== "string" || !title.trim()) {
      return Response.json({ error: "Invalid title" }, { status: 400 });
    }
    updates.title = title.trim();
  }

  if (target !== undefined) {
    if (!Number.isInteger(target) || target < 1 || target > 10000) {
      return Response.json({ error: "Invalid target" }, { status: 400 });
    }
    updates.target = target;
  }

  if (unit !== undefined) {
    if (typeof unit !== "string" || !unit.trim()) {
      return Response.json({ error: "Invalid unit" }, { status: 400 });
    }
    updates.unit = unit.trim();
  }

  if (recurrence !== undefined) {
    if (!["daily", "weekly", "monthly"].includes(recurrence)) {
      return Response.json({ error: "Invalid recurrence" }, { status: 400 });
    }
    updates.recurrence = recurrence;
  }

  if (current !== undefined) {
    if (!Number.isInteger(current) || current < 0) {
      return Response.json({ error: "Invalid current value" }, { status: 400 });
    }

    if (current > existingGoal.target) {
      return Response.json(
        { error: "current cannot exceed target" },
        { status: 400 }
      );
    }

    updates.current = current;
  }

  if (Object.keys(updates).length === 0) {
    return Response.json({ goal: existingGoal });
  }

  const wasCompleted =
    existingGoal.current >= existingGoal.target;

  const { data: updatedGoal, error } = await supabaseAdmin
    .from("goals")
    .update(updates)
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

  const isNowCompleted =
    updatedGoal.current >= updatedGoal.target;

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