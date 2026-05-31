import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveAppUser } from "@/lib/resolve-user";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** How long a user must wait between data exports (milliseconds). */
const EXPORT_RATE_LIMIT_MS = 60 * 60 * 1000; // 1 hour

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Scrubs any key whose name contains a sensitive keyword.
 * Operates recursively so nested objects (e.g. webhook payload JSON) are also
 * cleaned before they appear in the export.
 *
 * We chose a recursive key-scanner rather than an allowlist because the
 * schema evolves: a new column named `secret_key` added to any table is
 * automatically redacted without a code change.
 */
const SENSITIVE_KEY_PATTERNS = [
  /token/i,
  /secret/i,
  /password/i,
  /api_key/i,
  /access_key/i,
  /refresh/i,
  /credential/i,
  /private/i,
  /auth/i,
];

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((re) => re.test(key));
}

function redactSensitiveFields(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactSensitiveFields);
  }

  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = isSensitiveKey(k) ? "[REDACTED]" : redactSensitiveFields(v);
    }
    return result;
  }

  return value;
}

/**
 * Writes an audit row to `data_export_audit`.  Non-fatal — a logging failure
 * must never block the export or the delete.
 *
 * Schema (create once in a migration):
 *
 *   create table data_export_audit (
 *     id          uuid primary key default gen_random_uuid(),
 *     user_id     uuid not null references users(id) on delete cascade,
 *     action      text not null,          -- 'export' | 'delete'
 *     ip          text,
 *     user_agent  text,
 *     created_at  timestamptz not null default now()
 *   );
 */
async function writeAuditLog(
  userId: string,
  action: "export" | "delete",
  req: NextRequest | null,
): Promise<void> {
  try {
    const ip =
      req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req?.headers.get("x-real-ip") ??
      null;
    const userAgent = req?.headers.get("user-agent") ?? null;

    await supabaseAdmin.from("data_export_audit").insert({
      user_id: userId,
      action,
      ip,
      user_agent: userAgent,
    });
  } catch (err) {
    // Intentionally swallowed — audit failure must not fail the request.
    console.error("[audit] Failed to write audit log:", err);
  }
}

/**
 * Checks whether the user has exported data recently.
 * Returns the Date of the last export if within the rate-limit window, or
 * null if the user is allowed to export now.
 */
async function getRecentExport(userId: string): Promise<Date | null> {
  const since = new Date(Date.now() - EXPORT_RATE_LIMIT_MS).toISOString();

  const { data } = await supabaseAdmin
    .from("data_export_audit")
    .select("created_at")
    .eq("user_id", userId)
    .eq("action", "export")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ? new Date(data.created_at as string) : null;
}

// ---------------------------------------------------------------------------
// GET — Export user data
// ---------------------------------------------------------------------------

/**
 * Why no re-authentication step?
 *
 * The project has no existing re-auth pattern (no `/api/auth/reauth` route,
 * no password column, no TOTP infrastructure visible in the codebase). The
 * only identity provider is GitHub OAuth, and re-triggering that flow from an
 * API route would require a redirect, breaking the JSON contract of this
 * endpoint.
 *
 * Instead we apply the safest alternative that fits the existing architecture:
 *   1. Rate limiting — at most one export per hour per user, enforced via the
 *      audit log so it survives server restarts.
 *   2. Audit logging — every export is recorded with timestamp, IP, and UA so
 *      suspicious patterns can be detected after the fact.
 *
 * If a re-auth pattern is introduced in the future, add a
 * `requiresRecentAuth()` guard here before the rate-limit check.
 */
export async function GET(req: NextRequest) {
  // --- Authentication --------------------------------------------------
  const session = await getServerSession(authOptions);
  if (!session?.githubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await resolveAppUser(session.githubId, session.githubLogin);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // --- Rate limiting ---------------------------------------------------
  const lastExport = await getRecentExport(user.id);
  if (lastExport) {
    const retryAfterMs = EXPORT_RATE_LIMIT_MS - (Date.now() - lastExport.getTime());
    const retryAfterSecs = Math.ceil(retryAfterMs / 1000);
    return NextResponse.json(
      {
        error: "Rate limit exceeded. You may export your data once per hour.",
        retryAfterSeconds: retryAfterSecs,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSecs),
        },
      },
    );
  }

  // --- Audit log (before fetch so a crash mid-fetch is still recorded) --
  await writeAuditLog(user.id, "export", req);

  // --- Data collection -------------------------------------------------
  // Every query is scoped to `user.id` which was resolved from the
  // authenticated session — there is no user-supplied target ID, so IDOR
  // is not possible with the current design.

  const sections: Record<string, unknown> = {};

  const { data: userData } = await supabaseAdmin
    .from("users")
    .select("id, github_login, is_public, leaderboard_opt_in, created_at")
    .eq("id", user.id)
    .single();
  if (userData) {
    sections.user = {
      githubLogin: userData.github_login,
      isPublic: userData.is_public,
      leaderboardOptIn: userData.leaderboard_opt_in,
      createdAt: userData.created_at,
    };
  }

  const { data: goals } = await supabaseAdmin
    .from("goals")
    .select("id, user_id, title, description, status, created_at, updated_at")
    .eq("user_id", user.id);
  sections.goals = goals || [];

  const { data: snapshots } = await supabaseAdmin
    .from("metric_snapshots")
    .select(
      "id, user_id, streak_current, streak_longest, total_commits, total_prs, total_issues, snapshot_at",
    )
    .eq("user_id", user.id)
    .order("snapshot_at", { ascending: false })
    .limit(1000);
  sections.metricSnapshots = snapshots || [];

  const { data: webhooks } = await supabaseAdmin
    .from("webhook_configs")
    // Intentionally exclude any secret/signing columns that may be added later;
    // the redactSensitiveFields pass below is a second safety net.
    .select("id, name, url, events, is_enabled, created_at")
    .eq("user_id", user.id);
  sections.webhooks = webhooks || [];

  const webhookIds = webhooks?.map((w) => w.id) ?? [];
  const { data: webhookDeliveries } = await supabaseAdmin
    .from("webhook_deliveries")
    // `payload` and `response_body` may contain tokens embedded in JSON; the
    // redactSensitiveFields pass below will scrub any recognised key names.
    .select(
      "id, webhook_id, event_type, payload, response_status, response_body, delivered_at, created_at",
    )
    .in("webhook_id", webhookIds);
  sections.webhookDeliveries = webhookDeliveries || [];

  const { data: streakFreezes } = await supabaseAdmin
    .from("streak_freezes")
    .select("id, user_id, freeze_date, created_at")
    .eq("user_id", user.id);
  sections.streakFreezes = streakFreezes || [];

  const { data: streakMilestones } = await supabaseAdmin
    .from("streak_milestones")
    .select("id, user_id, streak_length, milestone_type, achieved_at")
    .eq("user_id", user.id);
  sections.streakMilestones = streakMilestones || [];

  const { data: linkedAccounts } = await supabaseAdmin
    .from("user_github_accounts")
    // Deliberately omit any token columns — only identity fields are exported.
    .select("id, user_id, github_id, github_login, created_at")
    .eq("user_id", user.id);
  sections.linkedAccounts = linkedAccounts || [];

  const { data: localCodingSessions } = await supabaseAdmin
    .from("local_coding_sessions")
    .select(
      "id, user_id, date, duration_minutes, lines_added, lines_deleted, commits_count",
    )
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .limit(365);
  sections.localCodingSessions = localCodingSessions || [];

  // --- Redact any sensitive fields that slipped through the column selects --
  const redactedSections = redactSensitiveFields(sections) as Record<string, unknown>;

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    userId: user.id,
    githubLogin: session.githubLogin,
    sections: redactedSections,
  });
}

// ---------------------------------------------------------------------------
// DELETE — Delete account
// ---------------------------------------------------------------------------

export async function DELETE(req: NextRequest) {
  // --- Authentication --------------------------------------------------
  const session = await getServerSession(authOptions);
  if (!session?.githubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await resolveAppUser(session.githubId, session.githubLogin);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // --- Confirmation guard ----------------------------------------------
  const body = await req.json().catch(() => ({}));
  const { confirmText } = body as { confirmText?: string };

  if (confirmText !== "DELETE") {
    return NextResponse.json(
      { error: "Please type DELETE to confirm account deletion" },
      { status: 400 },
    );
  }

  // --- Audit log (before deletion so the row still exists) -------------
  await writeAuditLog(user.id, "delete", req);

  // --- Data deletion ---------------------------------------------------
  const tablesToDelete = [
  "streak_freezes",
  "streak_milestones",
  "local_coding_sessions",
  "local_coding_api_keys",
  "jira_credentials",
  "webhook_configs",
  "user_github_accounts",
  "goals",
  "metric_snapshots",
];

  for (const table of tablesToDelete) {
    await supabaseAdmin.from(table).delete().eq("user_id", user.id);
  }

  await supabaseAdmin.from("users").delete().eq("id", user.id);

  // --- Clear session cookie --------------------------------------------
  const response = NextResponse.json({
    success: true,
    message: "All user data has been deleted. You will be signed out.",
  });

  const useSecureCookies = process.env.NODE_ENV === "production";
  const sessionTokenCookieName = useSecureCookies
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token";

  response.cookies.set({
    name: sessionTokenCookieName,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: useSecureCookies,
    path: "/",
    expires: new Date(0),
  });

  return response;
}
