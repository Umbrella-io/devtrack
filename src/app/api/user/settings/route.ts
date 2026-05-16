import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import {
  isSupabaseConfigured,
  supabaseAdmin,
  updateUserPublicFlag,
} from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.githubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured) {
    return NextResponse.json({
      id: null,
      github_login: session.githubLogin ?? null,
      is_public: false,
    });
  }

  // Fetch user from Supabase
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, github_login, is_public")
    .eq("github_id", session.githubId)
    .single();

  if (error) {
    return NextResponse.json({
      id: null,
      github_login: session.githubLogin ?? null,
      is_public: false,
    });
  }

  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.githubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { error: "Supabase is not configured" },
      { status: 503 }
    );
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
  let body: { is_public?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { is_public } = body;

  if (typeof is_public !== "boolean") {
    return NextResponse.json(
      { error: "is_public must be a boolean" },
      { status: 400 }
    );
  }

  // Update user public flag
  const updated = await updateUserPublicFlag(user.id, is_public);

  if (!updated) {
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
  });
}
