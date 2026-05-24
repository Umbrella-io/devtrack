import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { getAllAccounts } from "@/lib/github-accounts";
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
  last_synced_at?: string | null;
  updated_at?: string | null;
  created_at: string;
}

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

function getMetricFromUnit(unit: string): "commits" | "prs" | "issues" | null {
  const u = unit.toLowerCase().trim();
  if (u === "commits" || u === "commit") {
    return "commits";
  }
  if (u === "prs" || u === "pr" || u === "pull requests" || u === "pull request") {
    return "prs";
  }
  if (u === "issues" || u === "issue") {
    return "issues";
  }
  return null;
}

async function fetchCountFromGitHub(
  token: string,
  githubLogin: string,
  metric: "commits" | "prs" | "issues",
  since: string
): Promise<number> {
  const sinceStr = new Date(since).toISOString().slice(0, 19) + "Z";
  let url = "";

  if (metric === "commits") {
    url = `https://api.github.com/search/commits?q=author:${githubLogin}+author-date:>=${sinceStr}&per_page=1`;
  } else if (metric === "prs") {
    url = `https://api.github.com/search/issues?q=author:${githubLogin}+type:pr+created:>=${sinceStr}&per_page=1`;
  } else if (metric === "issues") {
    url = `https://api.github.com/search/issues?q=author:${githubLogin}+type:issue+created:>=${sinceStr}&per_page=1`;
  } else {
    return 0;
  }

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      console.error(`GitHub API error: ${res.status} on URL ${url}`);
      return 0;
    }

    const data = (await res.json()) as { total_count?: number };
    return data.total_count ?? 0;
  } catch (err) {
    console.error(`Failed to fetch count from GitHub for ${githubLogin}:`, err);
    return 0;
  }
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
          .update({ current: 0, period_start: periodStart.toISOString(), last_synced_at: null })
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

  // 1. Get all linked accounts
  let accounts: Array<{ token: string; githubId: string; githubLogin: string }> = [];
  try {
    accounts = await getAllAccounts(
      {
        token: session.accessToken!,
        githubId: session.githubId!,
        githubLogin: session.githubLogin!,
      },
      user.id
    );
  } catch (err) {
    console.error("Failed to load all accounts, falling back to primary:", err);
    accounts = [
      {
        token: session.accessToken!,
        githubId: session.githubId!,
        githubLogin: session.githubLogin!,
      },
    ];
  }

  const COOLDOWN_MS = 5 * 60 * 1000; // 5-minute sync cooldown
  const requestCache = new Map<string, Promise<number>>();

  async function getDeduplicatedCount(
    token: string,
    githubLogin: string,
    metric: "commits" | "prs" | "issues",
    since: string
  ): Promise<number> {
    const cacheKey = `${githubLogin}:${metric}:${since}`;
    if (requestCache.has(cacheKey)) {
      return requestCache.get(cacheKey)!;
    }
    const promise = fetchCountFromGitHub(token, githubLogin, metric, since);
    requestCache.set(cacheKey, promise);
    return promise;
  }

  // 2. Map goals and perform pull-based sync if automated
  const syncedGoals = await Promise.all(
    processedGoals.map(async (goal: Goal) => {
      const metric = getMetricFromUnit(goal.unit);
      if (!metric) return goal;

      // 5-Minute Sync Cooldown Check
      if (goal.last_synced_at) {
        const timeSinceSync = Date.now() - new Date(goal.last_synced_at).getTime();
        if (timeSinceSync < COOLDOWN_MS) {
          // Cooldown active, skip querying GitHub and return stored value
          return goal;
        }
      }

      // Determine period start date
      const since = goal.period_start || new Date(0).toISOString();

      // Fetch counts across all linked accounts in parallel (deduplicated)
      const counts = await Promise.all(
        accounts.map((account) =>
          getDeduplicatedCount(account.token, account.githubLogin, metric, since)
        )
      );

      const totalCount = counts.reduce((sum, count) => sum + count, 0);
      let updatedCurrent = totalCount;

      // Reconciliation Logic: avoid overwriting DB value if new fetched count is less than current DB count
      // and last update was very recent (under 5 minutes, likely due to GitHub Search indexing delay).
      if (totalCount < goal.current) {
        const lastUpdated = goal.updated_at ? new Date(goal.updated_at).getTime() : 0;
        const timeSinceUpdate = Date.now() - lastUpdated;
        if (timeSinceUpdate < COOLDOWN_MS) {
          updatedCurrent = goal.current;
        }
      }

      const nowStr = new Date().toISOString();

      // Update Supabase if values changed or to record that we performed a sync (refresh cooldown)
      if (goal.current !== updatedCurrent || !goal.last_synced_at) {
        const { data: updatedGoal } = await supabaseAdmin
          .from("goals")
          .update({
            current: updatedCurrent,
            last_synced_at: nowStr,
            updated_at: nowStr,
          })
          .eq("id", goal.id)
          .select()
          .single();

        if (updatedGoal) return updatedGoal;
      } else {
        // If counts matched and we already have last_synced_at, we still update the last_synced_at
        // timestamp to reset the cooldown so we don't fetch on subsequent reloads.
        const { data: updatedGoal } = await supabaseAdmin
          .from("goals")
          .update({
            last_synced_at: nowStr,
          })
          .eq("id", goal.id)
          .select()
          .single();

        if (updatedGoal) return updatedGoal;
      }

      return {
        ...goal,
        current: updatedCurrent,
        last_synced_at: nowStr,
      };
    })
  );

  return Response.json({ goals: syncedGoals });
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

  // Only 'commits' triggers auto-progress; everything else is manual
  const unit = body.unit ?? "commits";

  const user = await resolveAppUser(session.githubId, session.githubLogin);
  if (!user) return Response.json({ error: "User not found" }, { status: 404 });

  const { data: goal, error } = await supabaseAdmin
    .from("goals")
    .insert({
      user_id: user.id,
      title: body.title,
      target: body.target,
      unit,
      recurrence,
      period_start: getPeriodStart(recurrence),
      current: 0,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ goal }, { status: 201 });
}
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

// Hard cap to prevent storage exhaustion and catastrophic Promise.all execution
const MAX_GOALS_PER_USER = 20;

function getPeriodStart(recurrence: Recurrence): string {
  const now = new Date();
  if (recurrence === "weekly") {
    const day = now.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() + diff);
    monday.setUTCHours(0, 0, 0, 0);
    return monday.toISOString();
  }
  if (recurrence === "monthly") {
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

  // Added .limit() to bound the database payload and the subsequent Promise.all loop
  const { data: goals } = await supabaseAdmin
    .from("goals")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(MAX_GOALS_PER_USER);

  // Reset progress if we're in a new period
  const processedGoals = await Promise.all(
    (goals ?? []).map(async (goal: Goal) => {
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
          .lt("period_start", periodStart.toISOString())
          .select()
          .single();

        if (updated) return updated;

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

  // Pre-check count query using head option for peak performance
  const { count, error: countError } = await supabaseAdmin
    .from("goals")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (countError) {
    return Response.json({ error: "Failed to verify goal limits" }, { status: 500 });
  }

  if ((count ?? 0) >= MAX_GOALS_PER_USER) {
    return Response.json(
      { error: `You can have at most ${MAX_GOALS_PER_USER} goals.` },
      { status: 400 }
    );
  }

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
