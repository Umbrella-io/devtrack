import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Recurrence = "none" | "weekly" | "monthly";

function getPeriodStart(recurrence: Recurrence): string {
  const now = new Date();
  if (recurrence === "weekly") {
    // Use UTC methods so the Monday boundary is the same regardless of the
    // server's local timezone. getDay() / setDate() / setHours() all operate
    // in local time, which can push the reset boundary a day early or late
    // on servers that are not running in UTC.
    const day = now.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() + diff);
    monday.setUTCHours(0, 0, 0, 0);
    return monday.toISOString();
  }
  if (recurrence === "monthly") {
    // Date.UTC avoids the local-timezone offset that the Date constructor
    // applies when month/day/hour arguments are passed directly.
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
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
        // Use a conditional update that only succeeds when the DB row still
        // has the old period_start. If two concurrent GET requests both see
        // a stale period_start and race to reset the goal, only one update
        // will match the lt() filter — the second finds no row and returns
        // null, after which we re-fetch the already-reset row to avoid
        // silently zeroing out any progress written between the two reads.
        const { data: updated } = await supabaseAdmin
          .from("goals")
          .update({ current: 0, period_start: periodStart.toISOString() })
          .eq("id", goal.id)
          .lt("period_start", periodStart.toISOString())
          .select()
          .single();

        if (updated) return updated;

        // Another concurrent request already reset this goal — re-fetch
        // the current state so we return accurate data without clobbering it.
        const { data: current } = await supabaseAdmin
          .from("goals")
          .select("*")
          .eq("id", goal.id)
          .single();
        return current ?? goal;
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