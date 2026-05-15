import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin, updateUserPublicFlag } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.githubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch user from Supabase
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, github_login, is_public")
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
