import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveAppUser } from "@/lib/resolve-user";

export const dynamic = "force-dynamic";

interface Goal {
  id: string;
  user_id: string;
  title: string;
  target: number;
  current: number;
  unit: string;
  recurrence: string;
  period_start: string | null;
  created_at: string;
}

type Recurrence = "none" | "weekly" | "monthly";

const VALID_RECURRENCES = ["none", "weekly", "monthly"] as const;
const MAX_TITLE_LEN = 100;
const MAX_UNIT_LEN = 30;
const MIN_TARGET = 1;
const MAX_TARGET = 10_000;

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

  const user = await resolveAppUser(session.githubId, session.githubLogin);
  if (!user) return Response.json({ error: "User not found" }, { status: 404 });

  const { data: goals } = await supabaseAdmin
    .from("goals")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Reset progress if we're in a new period
  const processedGoals = await Promise.all(
    (goals ?? []).map(async (goal: Goal) => {
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { title, target, unit, recurrence } = body as Record<string, unknown>;

  if (typeof title !== "string" || title.trim().length === 0) {
    return Response.json({ error: "title must be a non-empty string" }, { status: 400 });
  }
  if (title.length > MAX_TITLE_LEN) {
    return Response.json({ error: `title must be ${MAX_TITLE_LEN} characters or fewer` }, { status: 400 });
  }
  if (
    typeof target !== "number" ||
    !Number.isInteger(target) ||
    target < MIN_TARGET ||
    target > MAX_TARGET
  ) {
    return Response.json(
      { error: `target must be an integer between ${MIN_TARGET} and ${MAX_TARGET}` },
      { status: 400 }
    );
  }

  const safeUnit = typeof unit === "string" ? unit.slice(0, MAX_UNIT_LEN) : "commits";
  const safeRecurrence: Recurrence = VALID_RECURRENCES.includes(recurrence as Recurrence)
    ? (recurrence as Recurrence)
    : "none";

  const user = await resolveAppUser(session.githubId, session.githubLogin);
  if (!user) return Response.json({ error: "User not found" }, { status: 404 });

  const { data: goal, error } = await supabaseAdmin
    .from("goals")
    .insert({
      user_id: user.id,
      title: title.trim(),
      target,
      unit: safeUnit,
      recurrence: safeRecurrence,
      period_start: getPeriodStart(safeRecurrence),
      current: 0,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ goal }, { status: 201 });
}