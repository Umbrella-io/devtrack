import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.githubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, github_login, is_public, pinned_repos")
    .eq("github_id", session.githubId)
    .single();

  if (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json({ error: "Failed to fetch user settings" }, { status: 500 });
  }

  return NextResponse.json({
    id: data.id,
    github_login: data.github_login,
    is_public: data.is_public,
    pinned_repos: data.pinned_repos || [],
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.githubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: user, error: fetchError } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("github_id", session.githubId)
    .single();

  if (fetchError || !user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let body: { is_public?: boolean; pinned_repos?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { is_public, pinned_repos } = body;
  const updates: { is_public?: boolean; pinned_repos?: string[] } = {};

  if (typeof is_public === "boolean") {
    updates.is_public = is_public;
  }

  if (Array.isArray(pinned_repos)) {
    if (pinned_repos.length > 3) {
      return NextResponse.json({ error: "Maximum 3 pins allowed" }, { status: 400 });
    }
    updates.pinned_repos = pinned_repos;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("users")
    .update(updates)
    .eq("id", user.id)
    .select("id, github_login, is_public, pinned_repos")
    .single();

  if (updateError || !updated) {
    console.error("Update error:", updateError);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }

  return NextResponse.json({
    id: updated.id,
    github_login: updated.github_login,
    is_public: updated.is_public,
    pinned_repos: updated.pinned_repos || [],
  });
}
