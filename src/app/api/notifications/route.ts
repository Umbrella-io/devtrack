import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function getUserId(githubId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("github_id", githubId)
    .single();
  return data?.id ?? null;
}

// GET — fetch 10 most recent notifications
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.githubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = await getUserId(session.githubId);
  if (!userId) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from("notifications")
    .select("id, type, message, read, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }

  const unreadCount = (data ?? []).filter((n) => !n.read).length;
  return NextResponse.json({ notifications: data ?? [], unreadCount });
}

// PATCH — mark all as read
export async function PATCH() {
  const session = await getServerSession(authOptions);
  if (!session?.githubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = await getUserId(session.githubId);
  if (!userId) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await supabaseAdmin
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);

  return NextResponse.json({ success: true });
}
