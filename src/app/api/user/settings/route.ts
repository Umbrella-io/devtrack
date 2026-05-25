import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveAppUser } from "@/lib/resolve-user";
import { encryptToken } from "@/lib/crypto";

export const dynamic = "force-dynamic";

async function fetchUserSettings(userId: string) {
  // Tier 1: All columns
  const res1 = await supabaseAdmin
    .from("users")
    .select("id, github_login, is_public, leaderboard_opt_in, pinned_repos, wakatime_api_key_encrypted, wakatime_api_key_iv")
    .eq("id", userId)
    .single();

  if (!res1.error) {
    return {
      data: res1.data as any,
      error: null,
      hasLeaderboardOptIn: true,
      hasPinnedRepos: true,
      hasWakatimeKey: true,
      leaderboard_opt_in: (res1.data as any).leaderboard_opt_in ?? false,
      pinned_repos: (res1.data as any).pinned_repos || [],
      wakatime_api_key_encrypted: (res1.data as any).wakatime_api_key_encrypted || null,
      wakatime_api_key_iv: (res1.data as any).wakatime_api_key_iv || null,
    };
  }

  if (res1.error.code !== "42703") {
    return {
      data: null,
      error: res1.error,
      hasLeaderboardOptIn: false,
      hasPinnedRepos: false,
      hasWakatimeKey: false,
      leaderboard_opt_in: false,
      pinned_repos: [] as string[],
      wakatime_api_key_encrypted: null,
      wakatime_api_key_iv: null,
    };
  }

  // Tier 2: Without pinned_repos
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
      hasWakatimeKey: false,
      leaderboard_opt_in: (res2.data as any).leaderboard_opt_in ?? false,
      pinned_repos: [] as string[],
      wakatime_api_key_encrypted: null,
      wakatime_api_key_iv: null,
    };
  }

  if (res2.error.code !== "42703") {
    return {
      data: null,
      error: res2.error,
      hasLeaderboardOptIn: false,
      hasPinnedRepos: false,
      hasWakatimeKey: false,
      leaderboard_opt_in: false,
      pinned_repos: [] as string[],
      wakatime_api_key_encrypted: null,
      wakatime_api_key_iv: null,
    };
  }

  // Tier 3: Minimal (without pinned_repos and leaderboard_opt_in)
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
      hasWakatimeKey: false,
      leaderboard_opt_in: false,
      pinned_repos: [] as string[],
      wakatime_api_key_encrypted: null,
      wakatime_api_key_iv: null,
    };
  }

  return {
    data: null,
    error: res3.error,
    hasLeaderboardOptIn: false,
    hasPinnedRepos: false,
    hasWakatimeKey: false,
    leaderboard_opt_in: false,
    pinned_repos: [] as string[],
    wakatime_api_key_encrypted: null,
    wakatime_api_key_iv: null,
  };
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.githubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await resolveAppUser(session.githubId, session.githubLogin);
  if (!user) {
    return NextResponse.json(
      { error: "Failed to fetch user settings" },
      { status: 500 }
    );
  }

  const result = await fetchUserSettings(user.id);

  if (result.error || !result.data) {
    console.error("Error fetching user settings:", result.error);
    return NextResponse.json({ error: "Failed to fetch user settings" }, { status: 500 });
  }

  return NextResponse.json({
    id: (result.data as any).id,
    github_login: (result.data as any).github_login,
    is_public: (result.data as any).is_public,
    leaderboard_opt_in: result.leaderboard_opt_in,
    pinned_repos: result.pinned_repos,
    has_wakatime_key: !!result.wakatime_api_key_encrypted && !!result.wakatime_api_key_iv,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.githubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await resolveAppUser(session.githubId, session.githubLogin);

  if (!user) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );
  }

  let body: { is_public?: boolean; leaderboard_opt_in?: boolean; pinned_repos?: string[]; wakatime_api_key?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { is_public, leaderboard_opt_in, pinned_repos, wakatime_api_key } = body;

  // Retrieve supported columns first
  const settingsResult = await fetchUserSettings(user.id);
  if (settingsResult.error || !settingsResult.data) {
    console.error("Error fetching settings during PATCH:", settingsResult.error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }

  const { hasLeaderboardOptIn, hasPinnedRepos, hasWakatimeKey } = settingsResult;
  const updates: { is_public?: boolean; leaderboard_opt_in?: boolean; pinned_repos?: string[]; wakatime_api_key_encrypted?: string | null; wakatime_api_key_iv?: string | null } = {};

  if (is_public !== undefined && is_public !== null && typeof is_public === "boolean") {
    updates.is_public = is_public;
  }

  if (
    hasLeaderboardOptIn &&
    leaderboard_opt_in !== undefined &&
    leaderboard_opt_in !== null &&
    typeof leaderboard_opt_in === "boolean"
  ) {
    updates.leaderboard_opt_in = leaderboard_opt_in;
    if (leaderboard_opt_in) {
      updates.is_public = true;
    }
  }

  if (hasPinnedRepos && pinned_repos !== undefined && pinned_repos !== null && Array.isArray(pinned_repos)) {
    if (pinned_repos.length > 3) {
      return NextResponse.json({ error: "Maximum 3 pins allowed" }, { status: 400 });
    }
    updates.pinned_repos = pinned_repos;
  }

  if (hasWakatimeKey && wakatime_api_key !== undefined) {
    if (wakatime_api_key === "") {
      updates.wakatime_api_key_encrypted = null;
      updates.wakatime_api_key_iv = null;
    } else if (typeof wakatime_api_key === "string") {
      try {
        const testRes = await fetch("https://wakatime.com/api/v1/users/current/summaries?range=Today", {
          headers: { Authorization: `Basic ${Buffer.from(wakatime_api_key + ":").toString("base64")}` },
        });
        if (!testRes.ok) {
          return NextResponse.json({ error: "Invalid Wakatime API key" }, { status: 400 });
        }
        const { encrypted, iv } = encryptToken(wakatime_api_key);
        updates.wakatime_api_key_encrypted = encrypted;
        updates.wakatime_api_key_iv = iv;
      } catch (err) {
        return NextResponse.json({ error: "Failed to validate or encrypt Wakatime key" }, { status: 500 });
      }
    }
  }

  // If there are no updates (or none that are supported by the schema)
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({
      id: (settingsResult.data as any).id,
      github_login: (settingsResult.data as any).github_login,
      is_public: (settingsResult.data as any).is_public,
      leaderboard_opt_in: settingsResult.leaderboard_opt_in,
      pinned_repos: settingsResult.pinned_repos,
      has_wakatime_key: !!settingsResult.wakatime_api_key_encrypted && !!settingsResult.wakatime_api_key_iv,
    });
  }

  // Query only supported columns in the returning select statement
  const selectCols = ["id", "github_login", "is_public"];
  if (hasLeaderboardOptIn) selectCols.push("leaderboard_opt_in");
  if (hasPinnedRepos) selectCols.push("pinned_repos");
  if (hasWakatimeKey) {
    selectCols.push("wakatime_api_key_encrypted");
    selectCols.push("wakatime_api_key_iv");
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("users")
    .update(updates)
    .eq("id", user.id)
    .select(selectCols.join(", "))
    .single();

  if (updateError || !updated) {
    console.error("Error updating settings:", updateError);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }

  return NextResponse.json({
    id: (updated as any).id,
    github_login: (updated as any).github_login,
    is_public: (updated as any).is_public,
    leaderboard_opt_in: (updated as any).leaderboard_opt_in ?? false,
    pinned_repos: (updated as any).pinned_repos || [],
    has_wakatime_key: !!(updated as any).wakatime_api_key_encrypted && !!(updated as any).wakatime_api_key_iv,
  });
}
