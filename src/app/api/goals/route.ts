import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Recurrence = "none" | "weekly" | "monthly";

function getPeriodStart(recurrence: Recurrence): string {
  const now = new Date();
  if (recurrence === "weekly") {
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString();
  }
  if (recurrence === "monthly") {
    return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).toISOString();
  }
  return new Date(0).toISOString(); // 'none' never resets
}

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

  const { data: goals } = await supabaseAdmin
    .from("goals")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Reset progress if we're in a new period
  const processedGoals = await Promise.all(
    (goals ?? []).map(async (goal) => {
      if (goal.recurrence === "none") return goal;

      const periodStart = new Date(getPeriodStart(goal.recurrence as Recurrence));
      const storedPeriodStart = goal.period_start
        ? new Date(goal.period_start)
        : new Date(0);

      if (storedPeriodStart < periodStart) {
        const { data: updated } = await supabaseAdmin
          .from("goals")
          .update({ current: 0, period_start: periodStart.toISOString() })
          .eq("id", goal.id)
          .select()
          .single();
        return updated ?? { ...goal, current: 0, period_start: periodStart.toISOString() };
      }

      return goal;
    })
  );

  return Response.json({ goals: processedGoals });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.githubId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    title?: string;
    target?: number;
    unit?: string;
    recurrence?: Recurrence;
  };

  if (!body.title || !body.target) {
    return Response.json({ error: "title and target required" }, { status: 400 });
  }

  const recurrence: Recurrence = body.recurrence ?? "none";
  if (!["none", "weekly", "monthly"].includes(recurrence)) {
    return Response.json({ error: "Invalid recurrence value" }, { status: 400 });
  }

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("github_id", session.githubId)
    .single();

  if (!user) return Response.json({ error: "User not found" }, { status: 404 });

  const { data: goal, error } = await supabaseAdmin
    .from("goals")
    .insert({
      user_id: user.id,
      title: body.title,
      target: body.target,
      unit: body.unit ?? "commits",
      recurrence,
      period_start: getPeriodStart(recurrence),
      current: 0,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ goal }, { status: 201 });
}