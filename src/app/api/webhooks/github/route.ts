import { NextRequest } from "next/server";
import { sendSSEEvent } from "@/lib/sse";
import { createHmac, timingSafeEqual } from "crypto";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { logError } from "@/lib/error-handler";

export const dynamic = "force-dynamic";

const SIGNATURE_HEADER = "x-hub-signature-256";
const GITHUB_EVENT_HEADER = "x-github-event";

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

function getExpectedSignature(secret: string, body: string): string {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}

function safeCompare(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");

  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right); // timingSafeEqual prevents timing attack vulnerabilities
}

function verifyGitHubSignature(
  body: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature?.startsWith("sha256=")) {
    return false;
  }

  return safeCompare(signature, getExpectedSignature(secret, body));
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
    .select("id")
    .maybeSingle();

  if (primaryError) {
    throw primaryError;
  }

  if (primaryUser) {
    return { userId: primaryUser.id as string, accountType: "primary" };
  }

  const { data: linkedAccount, error: linkedError } = await supabaseAdmin
    .from("user_github_accounts")
    .select("user_id")
    .eq("github_login", githubLogin)
    .maybeSingle();

  if (linkedError) {
    throw linkedError;
  }

  if (!linkedAccount?.user_id) {
    return null;
  }

  const { error: updateError } = await supabaseAdmin
    .from("users")
    .update({ updated_at: updatedAt })
    .eq("id", linkedAccount.user_id);

  if (updateError) {
    throw updateError;
  }

  return { userId: linkedAccount.user_id as string, accountType: "linked" };
}

export async function POST(req: NextRequest) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const signature = req.headers.get("x-hub-signature-256");
  if (!signature) {
    return new Response("Missing signature", { status: 401 });
  }

  const body = await req.text();
  const hmac = createHmac("sha256", secret);
  hmac.update(body);
  const expectedSignature = `sha256=${hmac.digest("hex")}`;

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    sigBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    return new Response("Invalid signature", { status: 401 });
  }

  const event = req.headers.get("x-github-event");
  const payload = JSON.parse(body);
  let staleResult: Awaited<ReturnType<typeof markUserMetricsStale>>;
  try {
    staleResult = await markUserMetricsStale(githubLogin);
  } catch (error) {
    logError(error, {
      endpoint: "/api/webhooks/github",
      operation: "mark_metrics_stale",
      userId: githubLogin,
      additionalContext: {
        repository: (payload.repository?.full_name),
        commitCount: payload.commits?.length,
      },
    });
    return NextResponse.json(
      { error: "Failed to trigger metric refresh" },
      { status: 500 }
    );
  }

  if (event === "push") {
    const userId = payload?.sender?.login;
    if (userId) {
      sendSSEEvent(userId, "commit", {
        repo: payload?.repository?.name,
        message: payload?.head_commit?.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  return new Response("OK", { status: 200 });
}