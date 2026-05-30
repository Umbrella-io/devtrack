import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { randomUUID } from "crypto";

// GET — fetch current opt-in status
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("digest_enabled")
    .eq("email", session.user.email)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ enabled: data?.digest_enabled ?? false });
}

// POST — toggle opt-in/out
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const enabled: boolean = body.enabled;

  const updates: Record<string, unknown> = { digest_enabled: enabled };

  if (enabled) {
    // Check if the user already has an unsubscribe token
    const { data: existing } = await supabaseAdmin
      .from("users")
      .select("digest_unsubscribe_token")
      .eq("email", session.user.email)
      .single();

    // Only generate a token if one doesn't exist yet
    if (!existing?.digest_unsubscribe_token) {
      updates.digest_unsubscribe_token = randomUUID();
    }

    // Store the email they want to receive digests at
    updates.digest_email = session.user.email;
  }

  const { error } = await supabaseAdmin
    .from("users")
    .update(updates)
    .eq("email", session.user.email);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, enabled });
}