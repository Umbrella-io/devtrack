
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyGitHubSignature } from "@/lib/crypto";
import { logError } from "@/lib/error-handler";
import { sendSSEEvent } from "@/lib/sse";
import { invalidateUserMetricsCache } from "@/lib/metrics-cache";
import { isGoalInCurrentPeriod, AUTO_SYNC_UNITS } from "@/lib/github/syncGoals";

export const dynamic = "force-dynamic";

const SIGNATURE_HEADER = "x-hub-signature-256";
const GITHUB_EVENT_HEADER = "x-github-event";
const DELIVERY_HEADER = "x-github-delivery";

interface GitHubPushPayload {
  after?: string;
  commits?: Array<unknown>;
  pusher?: {
    name?: string;
  };
  repository?: {
    full_name?: string;
  };
  sender?: {
    login?: string;
  };
}

/**
 * Records the delivery ID in the database. Returns true when the delivery has
 * already been processed (23505 unique-constraint violation), indicating the
 * handler should short-circuit without reprocessing.
 */
async function recordDelivery(deliveryId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("webhook_deliveries")
    .insert({ delivery_id: deliveryId });

  // 23505 = unique_violation — duplicate delivery from GitHub
  return error?.code === "23505";
}

function getPushActor(payload: GitHubPushPayload): string | null {
  return payload.sender?.login ?? payload.pusher?.name ?? null;
}

async function markUserMetricsStale(githubLogin: string) {
  const updatedAt = new Date().toISOString();

  const { data: primaryUser, error: primaryError } = await supabaseAdmin
    .from("users")
    .update({ updated_at: updatedAt })
    .eq("github_login", githubLogin)
    .select("id, github_id")
    .maybeSingle();

  if (primaryError) throw primaryError;

  if (primaryUser) {
    return { userId: primaryUser.id as string, githubId: String(primaryUser.github_id), accountType: "primary" };
  }

  const { data: linkedAccount, error: linkedError } = await supabaseAdmin
    .from("user_github_accounts")
    .select("user_id, github_id")
    .eq("github_login", githubLogin)
    .maybeSingle();

  if (linkedError) throw linkedError;

  if (!linkedAccount?.user_id) return null;

  const { error: updateError } = await supabaseAdmin
    .from("users")
    .update({ updated_at: updatedAt })
    .eq("id", linkedAccount.user_id);

  if (updateError) throw updateError;

  return { userId: linkedAccount.user_id as string, githubId: String(linkedAccount.github_id), accountType: "linked" };
}

/**
 * Finds all active commit goals for a user that fall within their current
 * period and increments each by pushCommitCount via the atomic
 * increment_goal_progress database function.
 */
async function incrementCommitGoals(userId: string, pushCommitCount: number): Promise<void> {
  const { data: goals } = await supabaseAdmin
    .from("goals")
    .select("id, recurrence, period_start")
    .eq("user_id", userId)
    .eq("unit", "commits")
    .in("unit", AUTO_SYNC_UNITS as unknown as string[]);

  if (!goals || goals.length === 0) return;

  const now = new Date().toISOString();
  const eligibleGoals = goals.filter(isGoalInCurrentPeriod);

  await Promise.all(
    eligibleGoals.map((goal) =>
      supabaseAdmin.rpc("increment_goal_progress", {
        p_goal_id: goal.id,
        p_increment: pushCommitCount,
        p_now: now,
      })
    )
  );
}

export async function POST(req: NextRequest) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "GitHub webhook secret is not configured" },
      { status: 500 }
    );
  }

  const body = await req.text();
  const signature = req.headers.get(SIGNATURE_HEADER);
  const deliveryId = req.headers.get(DELIVERY_HEADER);

  if (!deliveryId) {
    return NextResponse.json({ error: "Missing delivery ID" }, { status: 400 });
  }

  const isDuplicate = await recordDelivery(deliveryId);
  if (isDuplicate) {
    return NextResponse.json({ received: true });
  }

  if (!verifyGitHubSignature(body, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = req.headers.get(GITHUB_EVENT_HEADER);
  if (event !== "push") {
    return NextResponse.json({ received: true });
  }

  let payload: GitHubPushPayload;
  try {
    payload = JSON.parse(body) as GitHubPushPayload;
  } catch (e) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const githubLogin = getPushActor(payload);
  if (!githubLogin) {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  let staleResult: Awaited<ReturnType<typeof markUserMetricsStale>>;
  try {
    staleResult = await markUserMetricsStale(githubLogin);
  } catch (error) {
    logError(error, {
      endpoint: "/api/webhooks/github",
      operation: "mark_metrics_stale",
      userId: githubLogin,
      additionalContext: {
        repository: payload.repository?.full_name,
        commitCount: payload.commits?.length,
      },
    });
    return NextResponse.json(
      { error: "Failed to trigger metric refresh" },
      { status: 500 }
    );
  }

  if (staleResult) {
    await invalidateUserMetricsCache(githubLogin);
    if (staleResult.githubId) {
      await invalidateUserMetricsCache(staleResult.githubId);
    }

    // Increment commit goals for this user by the number of commits in the
    // push payload. increment_goal_progress enforces the target ceiling
    // atomically so concurrent pushes cannot overshoot.
    const pushCommitCount = payload.commits?.length ?? 1;
    if (pushCommitCount > 0) {
      await incrementCommitGoals(staleResult.userId, pushCommitCount);
    }

    sendSSEEvent(githubLogin, "commit", {
      repo: payload.repository?.full_name,
      timestamp: new Date().toISOString(),
    });
    revalidatePath(`/u/${githubLogin}`);
    revalidatePath("/dashboard");
  }

  return NextResponse.json({ received: true });
}
