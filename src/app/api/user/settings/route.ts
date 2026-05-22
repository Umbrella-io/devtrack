import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveAppUser } from "@/lib/resolve-user";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.githubId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await resolveAppUser(
      session.githubId,
      session.githubLogin
    );

    if (!user) {
      return NextResponse.json(
        { error: "Failed to resolve user" },
        { status: 500 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id, github_login, is_public, leaderboard_opt_in")
      .eq("id", user.id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Failed to fetch user settings" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET settings error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.githubId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await resolveAppUser(
      session.githubId,
      session.githubLogin
    );

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    let body: {
      is_public?: boolean;
      leaderboard_opt_in?: boolean;
    };

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
        { error: "No valid fields provided" },
        { status: 400 }
      );
    }

    const updates: any = {};

    if (typeof is_public === "boolean") {
      updates.is_public = is_public;
    }

    if (typeof leaderboard_opt_in === "boolean") {
      updates.leaderboard_opt_in = leaderboard_opt_in;

      if (leaderboard_opt_in) {
        updates.is_public = true;
      }
    }

    const { data, error } = await supabaseAdmin
      .from("users")
      .update(updates)
      .eq("id", user.id)
      .select("id, github_login, is_public, leaderboard_opt_in")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Failed to update settings" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("PATCH settings error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
