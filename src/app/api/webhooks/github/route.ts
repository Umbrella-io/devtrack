import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase";

const table = process.env.GITHUB_CACHE_TABLE || "github_metrics_cache";

function verifySignature(secret: string, body: string, signature: string | null) {
  if (!signature) return false;
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(body);
  const digest = `sha256=${hmac.digest("hex")}`;
  // constant-time compare
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

export async function POST(req: NextRequest) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  const body = await req.text();
  const signature = req.headers.get("x-hub-signature-256");

  if (!secret) return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  if (!verifySignature(secret, body, signature)) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  const event = req.headers.get("x-github-event") || "";

  try {
    // Simple invalidation strategy: delete any cached issue metrics entries.
    await supabaseAdmin.from(table).delete().like("key", "issuesMetrics:%");
  } catch (err) {
    console.error("Failed to invalidate cache:", err);
  }

  return NextResponse.json({ ok: true, event });
}
