import { supabaseAdmin } from "@/lib/supabase";
import { extractValidRepoFromGoal } from "@/lib/goals-sync-utils";

export const GITHUB_API = "https://api.github.com";

export const AUTO_SYNC_UNITS = [
  "commits",
  "prs",
  "reviews",
  "issues_closed",
  "issues_opened",
  "open_source_prs",
] as const;

export type AutoSyncUnit = (typeof AUTO_SYNC_UNITS)[number];

interface SyncGoal {
  id: string;
  unit: string;
  repo: string | null;
  repository: string | null;
  repo_name: string | null;
  recurrence: string;
  period_start: string | null;
  target: number;
}

export interface SyncResult {
  goalsUpdated: number;
  commitsProcessed: number;
  lastSyncedAt: string;
}

/** Returns Monday 00:00:00 UTC of the current ISO week. */
export function currentWeekStart(): Date {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

/** Returns Sunday 23:59:59.999 UTC of the current ISO week. */
export function currentWeekEnd(): Date {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? 0 : 7 - day;
  const sunday = new Date(now);
  sunday.setUTCDate(now.getUTCDate() + diff);
  sunday.setUTCHours(23, 59, 59, 999);
  return sunday;
}

/** Returns the first instant of the current UTC month. */
export function currentMonthStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** Returns the last instant of the current UTC month. */
export function currentMonthEnd(): Date {
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  end.setUTCMilliseconds(-1);
  return end;
}

/**
 * Returns true when a goal's stored period_start falls within the goal's
 * current active period (weekly, monthly, or always-on for "none").
 */
export function isGoalInCurrentPeriod(goal: Pick<SyncGoal, "recurrence" | "period_start">): boolean {
  const { recurrence, period_start } = goal;
  if (!period_start) return recurrence === "none";

  const ps = new Date(period_start);

  if (recurrence === "weekly") {
    const ws = currentWeekStart();
    const we = currentWeekEnd();
    return ps >= ws && ps <= we;
  }

  if (recurrence === "monthly") {
    const ms = currentMonthStart();
    const me = currentMonthEnd();
    return ps >= ms && ps <= me;
  }

  // "none" goals have no period boundary — always eligible.
  return true;
}

/** Fetches total commit count for a GitHub login within a date range. */
async function countCommits(
  githubLogin: string,
  accessToken: string,
  since: string,
  until: string,
  repo: string | null
): Promise<number> {
  let page = 1;
  let total = 0;

  while (true) {
    const qParts = [`author:${githubLogin}`, `author-date:${since}..${until}`];
    if (repo) qParts.push(`repo:${repo}`);

    const params = new URLSearchParams({
      q: qParts.join(" "),
      per_page: "100",
      page: String(page),
    });

    const res = await fetch(`${GITHUB_API}/search/commits?${params}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
      },
      cache: "no-store",
    });

    if (res.status === 403 || res.status === 429) {
      throw Object.assign(new Error("GitHub rate limit reached"), { rateLimited: true });
    }

    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);

    const data = (await res.json()) as { items?: unknown[] };
    const items = data.items ?? [];
    total += items.length;

    if (items.length < 100) break;
    page++;
  }

  return total;
}

/**
 * Recomputes goal progress for all auto-sync goals belonging to a user from
 * GitHub source-of-truth data. Handles commits, PRs, reviews, and issue
 * activity. Returns a summary of what was updated.
 */
export async function syncGoals(opts: {
  userId: string;
  accessToken: string;
  githubLogin: string;
}): Promise<SyncResult> {
  const { userId, accessToken, githubLogin } = opts;

  const weekStart = currentWeekStart().toISOString();
  const weekEnd = currentWeekEnd().toISOString();
  const monthStart = currentMonthStart().toISOString();
  const monthEnd = currentMonthEnd().toISOString();
  const now = new Date().toISOString();

  // Fetch all active auto-sync goals (weekly, monthly, and none recurrence).
  const { data: goals, error: goalsError } = await supabaseAdmin
    .from("goals")
    .select("id, unit, repo, repository, repo_name, recurrence, period_start, target")
    .eq("user_id", userId)
    .in("unit", AUTO_SYNC_UNITS as unknown as string[]);

  if (goalsError) throw new Error("Failed to fetch goals");
  if (!goals || goals.length === 0) {
    return { goalsUpdated: 0, commitsProcessed: 0, lastSyncedAt: now };
  }

  // Filter to goals whose period_start is within the current period.
  const eligibleGoals = (goals as SyncGoal[]).filter(isGoalInCurrentPeriod);

  if (eligibleGoals.length === 0) {
    return { goalsUpdated: 0, commitsProcessed: 0, lastSyncedAt: now };
  }

  let totalUpdated = 0;
  let totalCommits = 0;

  // ── Commits ─────────────────────────────────────────────────────────────────
  const commitGoals = eligibleGoals.filter((g) => g.unit === "commits");
  for (const goal of commitGoals) {
    const repo = extractValidRepoFromGoal(goal);
    // Use the period boundaries that match the goal's recurrence.
    const [since, until] =
      goal.recurrence === "monthly"
        ? [monthStart, monthEnd]
        : goal.recurrence === "weekly"
        ? [weekStart, weekEnd]
        : ["1970-01-01T00:00:00Z", new Date().toISOString()];

    const count = await countCommits(githubLogin, accessToken, since, until, repo);
    totalCommits += count;

    const { error } = await supabaseAdmin
      .from("goals")
      .update({ current: Math.min(count, goal.target), last_synced_at: now })
      .eq("id", goal.id);

    if (!error) totalUpdated++;
  }

  // ── PRs ─────────────────────────────────────────────────────────────────────
  const prGoals = eligibleGoals.filter((g) => g.unit === "prs");
  if (prGoals.length > 0) {
    const [since, until] = periodRange(prGoals[0].recurrence, weekStart, weekEnd, monthStart, monthEnd);
    const params = new URLSearchParams({
      q: `author:${githubLogin} type:pr is:merged merged:${since}..${until}`,
      per_page: "1",
    });
    const res = await fetch(`${GITHUB_API}/search/issues?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json" },
      cache: "no-store",
    });

    if (res.status === 403 || res.status === 429) {
      throw Object.assign(new Error("GitHub rate limit reached"), { rateLimited: true });
    }
    if (res.ok) {
      const data = await res.json() as { total_count: number };
      const count = data.total_count ?? 0;
      const ids = prGoals.map((g) => g.id);
      const prCount = count;
      for (const goal of prGoals) {
        const { error } = await supabaseAdmin
          .from("goals")
          .update({ current: Math.min(prCount, goal.target), last_synced_at: now })
          .eq("id", goal.id);
        if (!error) totalUpdated++;
      }
      void ids;
    }
  }

  // ── Reviews ─────────────────────────────────────────────────────────────────
  const reviewGoals = eligibleGoals.filter((g) => g.unit === "reviews");
  if (reviewGoals.length > 0) {
    const [since, until] = periodRange(reviewGoals[0].recurrence, weekStart, weekEnd, monthStart, monthEnd);
    const res = await fetch(
      `${GITHUB_API}/search/issues?q=reviewed-by:${githubLogin}+type:pr+updated:${since}..${until}&per_page=1`,
      {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json" },
        cache: "no-store",
      }
    );
    if (res.ok) {
      const data = await res.json() as { total_count: number };
      const count = data.total_count ?? 0;
      for (const goal of reviewGoals) {
        await supabaseAdmin
          .from("goals")
          .update({ current: Math.min(count, goal.target), last_synced_at: now })
          .eq("id", goal.id);
        totalUpdated++;
      }
    }
  }

  // ── Issues closed ────────────────────────────────────────────────────────────
  const issuesClosedGoals = eligibleGoals.filter((g) => g.unit === "issues_closed");
  if (issuesClosedGoals.length > 0) {
    const [since, until] = periodRange(issuesClosedGoals[0].recurrence, weekStart, weekEnd, monthStart, monthEnd);
    const res = await fetch(
      `${GITHUB_API}/search/issues?q=assignee:${githubLogin}+type:issue+state:closed+closed:${since}..${until}&per_page=1`,
      {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json" },
        cache: "no-store",
      }
    );
    if (res.ok) {
      const data = await res.json() as { total_count: number };
      const count = data.total_count ?? 0;
      for (const goal of issuesClosedGoals) {
        await supabaseAdmin
          .from("goals")
          .update({ current: Math.min(count, goal.target), last_synced_at: now })
          .eq("id", goal.id);
        totalUpdated++;
      }
    }
  }

  // ── Issues opened ────────────────────────────────────────────────────────────
  const issuesOpenedGoals = eligibleGoals.filter((g) => g.unit === "issues_opened");
  if (issuesOpenedGoals.length > 0) {
    const [since, until] = periodRange(issuesOpenedGoals[0].recurrence, weekStart, weekEnd, monthStart, monthEnd);
    const res = await fetch(
      `${GITHUB_API}/search/issues?q=author:${githubLogin}+type:issue+created:${since}..${until}&per_page=1`,
      {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json" },
        cache: "no-store",
      }
    );
    if (res.ok) {
      const data = await res.json() as { total_count: number };
      const count = data.total_count ?? 0;
      for (const goal of issuesOpenedGoals) {
        await supabaseAdmin
          .from("goals")
          .update({ current: Math.min(count, goal.target), last_synced_at: now })
          .eq("id", goal.id);
        totalUpdated++;
      }
    }
  }

  // ── Open-source PRs ──────────────────────────────────────────────────────────
  const osGoals = eligibleGoals.filter((g) => g.unit === "open_source_prs");
  if (osGoals.length > 0) {
    const [since, until] = periodRange(osGoals[0].recurrence, weekStart, weekEnd, monthStart, monthEnd);
    const res = await fetch(
      `${GITHUB_API}/search/issues?q=author:${githubLogin}+type:pr+is:merged+merged:${since}..${until}+-user:${githubLogin}&per_page=1`,
      {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json" },
        cache: "no-store",
      }
    );
    if (res.ok) {
      const data = await res.json() as { total_count: number };
      const count = data.total_count ?? 0;
      for (const goal of osGoals) {
        await supabaseAdmin
          .from("goals")
          .update({ current: Math.min(count, goal.target), last_synced_at: now })
          .eq("id", goal.id);
        totalUpdated++;
      }
    }
  }

  return {
    goalsUpdated: totalUpdated,
    commitsProcessed: totalCommits,
    lastSyncedAt: now,
  };
}

function periodRange(
  recurrence: string,
  weekStart: string,
  weekEnd: string,
  monthStart: string,
  monthEnd: string
): [string, string] {
  if (recurrence === "monthly") return [monthStart, monthEnd];
  if (recurrence === "weekly") return [weekStart, weekEnd];
  return ["1970-01-01T00:00:00Z", new Date().toISOString()];
}
