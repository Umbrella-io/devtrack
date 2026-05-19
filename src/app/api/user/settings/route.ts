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

  // Fetch user from Supabase
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, github_login, is_public, leaderboard_opt_in")
    .eq("github_id", session.githubId)
    .single();

  if (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user settings" },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.githubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user ID from Supabase
  const { data: user, error: fetchError } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("github_id", session.githubId)
    .single();

  if (fetchError || !user) {
    console.error("Error fetching user:", fetchError);
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );
  }

  // Parse request body
  let body: { is_public?: boolean; leaderboard_opt_in?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { is_public, leaderboard_opt_in } = body;

  if (
    typeof is_public !== "boolean" &&
    typeof leaderboard_opt_in !== "boolean"
  ) {
    return NextResponse.json(
      { error: "At least one boolean setting is required" },
      { status: 400 }
    );
  }

  const updates: { is_public?: boolean; leaderboard_opt_in?: boolean } = {};
  if (typeof is_public === "boolean") {
    updates.is_public = is_public;
  }
  if (typeof leaderboard_opt_in === "boolean") {
    updates.leaderboard_opt_in = leaderboard_opt_in;
    if (leaderboard_opt_in) {
      updates.is_public = true;
    }
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("users")
    .update(updates)
    .eq("id", user.id)
    .select("id, github_login, is_public, leaderboard_opt_in")
    .single();

  if (updateError || !updated) {
    console.error("Error updating settings:", updateError);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }

  // Return updated user (only safe fields)
  return NextResponse.json({
    id: updated.id,
    github_login: updated.github_login,
    is_public: updated.is_public,
    leaderboard_opt_in: updated.leaderboard_opt_in ?? false,
  });
}
