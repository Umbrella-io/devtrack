import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveAppUser } from "@/lib/resolve-user";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.githubId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await resolveAppUser(session.githubId, session.githubLogin);
  if (!user) return Response.json({ error: "User not found" }, { status: 404 });

  // Only delete if the goal belongs to the authenticated user
  const { error } = await supabaseAdmin
    .from("goals")
    .delete()
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) {
    return Response.json({ error: "Failed to delete goal" }, { status: 500 });
  }

  return Response.json({ success: true }, { status: 200 });
}

// PATCH /api/goals/[id] — update an existing goal
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

  // Fetch existing goal first to verify ownership
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("goals")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError || !existing) {
    return Response.json({ error: "Goal not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  const { title, target, unit, recurrence } = body as Record<string, unknown>;

  if (title !== undefined) {
    if (typeof title !== "string" || title.trim().length === 0) {
      return Response.json({ error: "title must be a non-empty string" }, { status: 400 });
    }
    if (title.length > 100) {
      return Response.json({ error: "title must be 100 characters or fewer" }, { status: 400 });
    }
    updates.title = title.trim();
  }

  if (target !== undefined) {
    if (
      typeof target !== "number" ||
      !Number.isInteger(target) ||
      target < 1 ||
      target > 10_000
    ) {
      return Response.json(
        { error: "target must be an integer between 1 and 10000" },
        { status: 400 }
      );
    }
    updates.target = target;
  }

  if (unit !== undefined) {
    const safeUnit = typeof unit === "string" ? unit.slice(0, 30) : "commits";
    updates.unit = safeUnit;
  }

  if (recurrence !== undefined) {
    const validRecurrences = ["none", "weekly", "monthly"];
    if (!validRecurrences.includes(recurrence as string)) {
      return Response.json({ error: "recurrence must be one of: none, weekly, monthly" }, { status: 400 });
    }
    updates.recurrence = recurrence;
  }

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("goals")
    .update(updates)
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  return Response.json({ goal: updated });
}
