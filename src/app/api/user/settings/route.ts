import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveAppUser } from "@/lib/resolve-user";

export const dynamic = "force-dynamic";

async function fetchUserSettings(userId: string) {
  // Tier 1: All columns
  const res1 = await supabaseAdmin
    .from("users")
    .select("id, github_login, is_public, leaderboard_opt_in, pinned_repos")
    .eq("id", userId)
    .single();

  if (!res1.error) {
    return {
      data: res1.data as any,
      error: null,
      hasLeaderboardOptIn: true,
      hasPinnedRepos: true,
      leaderboard_opt_in: (res1.data as any).leaderboard_opt_in ?? false,
      pinned_repos: (res1.data as any).pinned_repos || [],
    };
  }

  if (res1.error.code !== "42703") {
    return {
      data: null,
      error: res1.error,
      hasLeaderboardOptIn: false,
      hasPinnedRepos: false,
      leaderboard_opt_in: false,
      pinned_repos: [] as string[],
    };
  }

  // Tier 2
  const res2 = await supabaseAdmin
    .from("users")
    .select("id, github_login, is_public, leaderboard_opt_in")
    .eq("id", userId)
    .single();

  if (!res2.error) {
    return {
      data: res2.data as any,
      error: null,
      hasLeaderboardOptIn: true,
      hasPinnedRepos: false,
      leaderboard_opt_in: (res2.data as any).leaderboard_opt_in ?? false,
      pinned_repos: [] as string[],
    };
  }

  if (res2.error.code !== "42703") {
    return {
      data: null,
      error: res2.error,
      hasLeaderboardOptIn: false,
      hasPinnedRepos: false,
      leaderboard_opt_in: false,
      pinned_repos: [] as string[],
    };
  }

  // Tier 3
  const res3 = await supabaseAdmin
    .from("users")
    .select("id, github_login, is_public")
    .eq("id", userId)
    .single();

  if (!res3.error) {
    return {
      data: res3.data as any,
      error: null,
      hasLeaderboardOptIn: false,
      hasPinnedRepos: false,
      leaderboard_opt_in: false,
      pinned_repos: [] as string[],
    };
  }

  return {
    data: null,
    error: res3.error,
    hasLeaderboardOptIn: false,
    hasPinnedRepos: false,
    leaderboard_opt_in: false,
    pinned_repos: [] as string[],
  };
}

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
      console.error("Failed to resolve user for settings GET:", {
        githubId: session.githubId,
      });

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
      console.error("Error fetching user:", error);

      return NextResponse.json(
        { error: "Failed to fetch user settings" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /settings unexpected error:", err);

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
      console.error("Failed to resolve user for settings PATCH:", {
        githubId: session.githubId,
      });

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
        { error: "At least one boolean setting is required" },
        { status: 400 }
      );
    }

    const updates: {
      is_public?: boolean;
      leaderboard_opt_in?: boolean;
    } = {};

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

    return NextResponse.json({
      id: updated.id,
      github_login: updated.github_login,
      is_public: updated.is_public,
      leaderboard_opt_in:
        updated.leaderboard_opt_in ?? false,
    });
  } catch (err) {
    console.error("PATCH /settings unexpected error:", err);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
