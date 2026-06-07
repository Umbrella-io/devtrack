/**
 * Weekly coding digest cron endpoint.
 *
 * Triggered by Vercel Cron every Monday at 09:00 UTC (see vercel.json).
 * Self-hosted deployments can call this route from any external scheduler
 * by supplying:  Authorization: Bearer <CRON_SECRET>
 *
 * Execution model
 * ───────────────
 * 1. Authenticate via CRON_SECRET (fail-closed when env var is absent).
 * 2. Fetch all opted-in users who have an email address.
 * 3. Skip users whose last digest was sent within the past 6 days
 *    (idempotency guard prevents duplicate sends on re-runs).
 * 4. Fetch weekly metrics via GITHUB_TOKEN when configured; fall back
 *    to sending the email without metrics when the token is absent.
 * 5. Render HTML + plain-text email and POST to Resend.
 * 6. Record the send timestamp (best-effort; failure does not cancel batch).
 * 7. Process users in bounded parallel batches (BATCH_SIZE = 5) to stay
 *    within serverless function timeout budgets.
 * 8. Return { sentCount, failedCount, skippedCount, errors }.
 *
 * Backward-compatible contract:
 *   • Response always contains `sentCount`.
 *   • `message: "No users opted in"` when the query returns zero rows.
 *   • Auth errors return the same 401 / 500 shapes as before.
 */

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { buildDigestMetrics, buildUnsubscribeUrl } from "@/lib/weekly-digest";
import { buildDigestHtml, buildDigestText } from "@/lib/digest-email";
import type { DigestMetrics } from "@/lib/weekly-digest";

export const dynamic = "force-dynamic";

// Users who received a digest within the past 6 days are skipped so a
// duplicate cron trigger does not send two emails in the same week.
const DIGEST_COOLDOWN_MS = 6 * 24 * 60 * 60 * 1000;

// Maximum users processed in parallel per batch.
const BATCH_SIZE = 5;

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserRow {
  id?: string;
  github_login: string;
  email: string;
  timezone?: string | null;
  last_digest_sent_at?: string | null;
}

interface SendError {
  user: string;
  error: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function currentWeekLabel(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + daysToMonday);
  return monday.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Send one digest email via Resend.
 * Returns { ok: true } on success, { ok: false, error } on failure.
 * When RESEND_API_KEY is absent the call is skipped and treated as sent,
 * so self-hosted deployments using an external mailer are not penalised.
 */
async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: true };
  }

  const from =
    process.env.RESEND_FROM_EMAIL ?? "DevTrack <digest@devtrack.app>";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "(no body)");
      return { ok: false, error: `Resend HTTP ${res.status}: ${body}` };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Record the digest send timestamp for a user.
 * Best-effort — errors are logged but do not propagate to the caller.
 */
async function recordDigestSent(userId: string): Promise<void> {
  try {
    await supabaseAdmin
      .from("users")
      .update({ last_digest_sent_at: new Date().toISOString() })
      .eq("id", userId);
  } catch (err) {
    console.error(`[weekly-digest] Failed to record send for ${userId}:`, err);
  }
}

/**
 * Process a single user: check cooldown, fetch metrics, render and send email,
 * then record the send timestamp.
 */
async function processUser(
  user: UserRow,
  weekLabel: string,
  githubToken: string | undefined
): Promise<{ status: "sent" | "failed" | "skipped_cooldown"; error?: string }> {
  // ── Cooldown guard ────────────────────────────────────────────────────────
  if (user.last_digest_sent_at) {
    const lastSent = new Date(user.last_digest_sent_at).getTime();
    if (Date.now() - lastSent < DIGEST_COOLDOWN_MS) {
      return { status: "skipped_cooldown" };
    }
  }

  // ── Metric aggregation ────────────────────────────────────────────────────
  let metrics: DigestMetrics | null = null;
  if (githubToken) {
    try {
      metrics = await buildDigestMetrics(user.github_login, githubToken);
    } catch (err) {
      // Log and continue — the email is still delivered without live metrics.
      console.warn(
        `[weekly-digest] Metrics fetch failed for ${user.github_login}:`,
        err
      );
    }
  }

  // ── Build unsubscribe URL ─────────────────────────────────────────────────
  const unsubscribeUrl = user.id
    ? buildUnsubscribeUrl(user.id)
    : `${(process.env.NEXTAUTH_URL ?? "").replace(/\/$/, "")}/settings`;

  // ── Render email ──────────────────────────────────────────────────────────
  const emailData = {
    githubLogin: user.github_login,
    metrics,
    unsubscribeUrl,
    weekLabel,
  };

  const html = buildDigestHtml(emailData);
  const text = buildDigestText(emailData);

  // ── Send ──────────────────────────────────────────────────────────────────
  const result = await sendEmail({
    to: user.email,
    subject: `Your weekly coding digest — ${weekLabel}`,
    html,
    text,
  });

  if (!result.ok) {
    console.error(
      `[weekly-digest] Failed to send to ${user.email}: ${result.error}`
    );
    return { status: "failed", error: result.error };
  }

  // ── Record timestamp (best-effort) ────────────────────────────────────────
  if (user.id) {
    await recordDigestSent(user.id);
  }

  return { status: "sent" };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  // 1. Authenticate — fail closed when CRON_SECRET is absent or mismatched.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 500 }
    );
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 2. Fetch opted-in users who have an email address.
    const { data: users, error } = await supabaseAdmin
      .from("users")
      .select("id, github_login, email, timezone, last_digest_sent_at")
      .eq("weekly_digest_opt_in", true)
      .not("email", "is", null);

    if (error) {
      console.error("[weekly-digest] Error fetching users:", error);
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 }
      );
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ message: "No users opted in" });
    }

    // 3. Process users in parallel batches to respect timeout budgets.
    const weekLabel = currentWeekLabel();
    const githubToken = process.env.GITHUB_TOKEN || undefined;

    let sentCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    const errors: SendError[] = [];

    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = (users as UserRow[]).slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map((user) => processUser(user, weekLabel, githubToken))
      );

      for (let j = 0; j < results.length; j++) {
        const user = batch[j];
        const result = results[j];

        if (result.status === "rejected") {
          failedCount++;
          errors.push({
            user: user.github_login,
            error:
              result.reason instanceof Error
                ? result.reason.message
                : String(result.reason),
          });
        } else {
          const { status, error: sendError } = result.value;
          if (status === "sent") {
            sentCount++;
          } else if (status === "failed") {
            failedCount++;
            errors.push({
              user: user.github_login,
              error: sendError ?? "Unknown error",
            });
          } else if (status === "skipped_cooldown") {
            skippedCount++;
          }
        }
      }
    }

    console.log(
      `[weekly-digest] done — sent:${sentCount} failed:${failedCount} skipped:${skippedCount}`
    );

    return NextResponse.json({
      success: true,
      sentCount,
      failedCount,
      skippedCount,
      errors,
    });
  } catch (err) {
    console.error("[weekly-digest] Cron failed:", err);
    return NextResponse.json(
      { error: "Failed to process digests" },
      { status: 500 }
    );
  }
}
