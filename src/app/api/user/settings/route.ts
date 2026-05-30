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
    .select("id, github_login, bio, is_public, leaderboard_opt_in, pinned_repos, wakatime_api_key_encrypted, wakatime_api_key_iv, weekly_digest_opt_in, discord_webhook_url, timezone")
    .eq("id", userId)
    .single();

  if (!res1.error) {
    return {
      data: res1.data as any,
      error: null,
      hasLeaderboardOptIn: true,
      hasPinnedRepos: true,
      hasWakatimeKey: true,
      hasWeeklyDigestOptIn: true,
      hasDiscordSettings: true,
      hasBio: true,
      leaderboard_opt_in: (res1.data as any).leaderboard_opt_in ?? false,
      weekly_digest_opt_in: (res1.data as any).weekly_digest_opt_in ?? false,
      pinned_repos: (res1.data as any).pinned_repos || [],
      wakatime_api_key_encrypted: (res1.data as any).wakatime_api_key_encrypted || null,
      wakatime_api_key_iv: (res1.data as any).wakatime_api_key_iv || null,
      discord_webhook_url: (res1.data as any).discord_webhook_url || null,
      timezone: (res1.data as any).timezone || "UTC",
    };
  }

  if (res1.error.code !== "42703") {
    return {
      data: null,
      error: res1.error,
      hasLeaderboardOptIn: false,
      hasPinnedRepos: false,
      hasWakatimeKey: false,
      hasWeeklyDigestOptIn: false,
      hasDiscordSettings: false,
      hasBio: false,
      leaderboard_opt_in: false,
      weekly_digest_opt_in: false,
      pinned_repos: [] as string[],
      wakatime_api_key_encrypted: null,
      wakatime_api_key_iv: null,
      discord_webhook_url: null,
      timezone: "UTC",
    };
  }

  // Tier 2: Without bio, for deployments that have not run the latest migration.
  const res2 = await supabaseAdmin
    .from("users")
    .select("id, github_login, is_public, leaderboard_opt_in, pinned_repos, wakatime_api_key_encrypted, wakatime_api_key_iv")
    .eq("id", userId)
    .single();

  if (!res2.error) {
    return {
      data: res2.data as any,
      error: null,
      hasLeaderboardOptIn: true,
      hasPinnedRepos: true,
      hasWakatimeKey: true,
      hasWeeklyDigestOptIn: false,
      hasDiscordSettings: false,
      hasBio: false,
      leaderboard_opt_in: (res2.data as any).leaderboard_opt_in ?? false,
      weekly_digest_opt_in: false,
      pinned_repos: (res2.data as any).pinned_repos || [],
      wakatime_api_key_encrypted: (res2.data as any).wakatime_api_key_encrypted || null,
      wakatime_api_key_iv: (res2.data as any).wakatime_api_key_iv || null,
      discord_webhook_url: null,
      timezone: "UTC",
    };
  }

  if (res2.error.code !== "42703") {
    return {
      data: null,
      error: res2.error,
      hasLeaderboardOptIn: false,
      hasPinnedRepos: false,
      hasWakatimeKey: false,
      hasWeeklyDigestOptIn: false,
      hasDiscordSettings: false,
      hasBio: false,
      leaderboard_opt_in: false,
      weekly_digest_opt_in: false,
      pinned_repos: [] as string[],
      wakatime_api_key_encrypted: null,
      wakatime_api_key_iv: null,
      discord_webhook_url: null,
      timezone: "UTC",
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
      hasWeeklyDigestOptIn: false,
      hasDiscordSettings: false,
      hasBio: false,
      leaderboard_opt_in: false,
      weekly_digest_opt_in: false,
      pinned_repos: [] as string[],
      wakatime_api_key_encrypted: null,
      wakatime_api_key_iv: null,
      discord_webhook_url: null,
      timezone: "UTC",
    };
  }

  return {
    data: null,
    error: res3.error,
    hasLeaderboardOptIn: false,
    hasPinnedRepos: false,
    hasWakatimeKey: false,
    hasWeeklyDigestOptIn: false,
    hasDiscordSettings: false,
    hasBio: false,
    leaderboard_opt_in: false,
    weekly_digest_opt_in: false,
    pinned_repos: [] as string[],
    wakatime_api_key_encrypted: null,
    wakatime_api_key_iv: null,
    discord_webhook_url: null,
    timezone: "UTC",
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
    bio: (result.data as any).bio ?? "",
    is_public: (result.data as any).is_public,
    leaderboard_opt_in: result.leaderboard_opt_in,
    weekly_digest_opt_in: result.weekly_digest_opt_in,
    pinned_repos: result.pinned_repos,
    has_wakatime_key: !!result.wakatime_api_key_encrypted && !!result.wakatime_api_key_iv,
    discord_webhook_url: result.discord_webhook_url,
    timezone: result.timezone,
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

  let body: { is_public?: boolean; leaderboard_opt_in?: boolean; weekly_digest_opt_in?: boolean; pinned_repos?: string[]; wakatime_api_key?: string; discord_webhook_url?: string | null; timezone?: string; bio?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { is_public, leaderboard_opt_in, weekly_digest_opt_in, pinned_repos, wakatime_api_key, discord_webhook_url, timezone, bio } = body;

  // Retrieve supported columns first
  const settingsResult = await fetchUserSettings(user.id);
  if (settingsResult.error || !settingsResult.data) {
    console.error("Error fetching settings during PATCH:", settingsResult.error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }

  const { hasLeaderboardOptIn, hasPinnedRepos, hasWakatimeKey, hasWeeklyDigestOptIn, hasDiscordSettings, hasBio } = settingsResult;
  const updates: { is_public?: boolean; leaderboard_opt_in?: boolean; weekly_digest_opt_in?: boolean; pinned_repos?: string[]; wakatime_api_key_encrypted?: string | null; wakatime_api_key_iv?: string | null; discord_webhook_url?: string | null; timezone?: string; bio?: string } = {};

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

  if (
    hasWeeklyDigestOptIn &&
    weekly_digest_opt_in !== undefined &&
    weekly_digest_opt_in !== null &&
    typeof weekly_digest_opt_in === "boolean"
  ) {
    updates.weekly_digest_opt_in = weekly_digest_opt_in;
  }

  if (hasPinnedRepos && pinned_repos !== undefined && pinned_repos !== null && Array.isArray(pinned_repos)) {
    if (pinned_repos.length > 3) {
      return NextResponse.json({ error: "Maximum 3 pins allowed" }, { status: 400 });
    }
    updates.pinned_repos = pinned_repos;
  }

  if (!hasBio && bio !== undefined) {
    return NextResponse.json(
      { error: "Bio settings are not available until the latest database migration is applied" },
      { status: 400 }
    );
  }

  if (hasBio && bio !== undefined) {
    if (typeof bio !== "string") {
      return NextResponse.json({ error: "Bio must be a string" }, { status: 400 });
    }

    if (bio.length > 500) {
      return NextResponse.json({ error: "Bio must be 500 characters or fewer" }, { status: 400 });
    }

    updates.bio = bio;
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

  // Handle Discord settings (only if the discord columns exist in the schema)
  if (hasDiscordSettings && discord_webhook_url !== undefined) {
    if (discord_webhook_url === "") {
      updates.discord_webhook_url = null;
    } else if (typeof discord_webhook_url === "string" && (discord_webhook_url.startsWith("https://discord.com/api/webhooks/") || discord_webhook_url.startsWith("https://discordapp.com/api/webhooks/"))) {
      updates.discord_webhook_url = discord_webhook_url;
    } else if (discord_webhook_url !== null) {
      return NextResponse.json({ error: "Invalid Discord webhook URL" }, { status: 400 });
    } else {
      updates.discord_webhook_url = null;
    }
  }

  if (hasDiscordSettings && timezone !== undefined && typeof timezone === "string") {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      updates.timezone = timezone;
    } catch {
      return NextResponse.json({ error: "Invalid timezone" }, { status: 400 });
    }
  }

  // If there are no updates (or none that are supported by the schema)
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({
      id: (settingsResult.data as any).id,
      github_login: (settingsResult.data as any).github_login,
      bio: (settingsResult.data as any).bio ?? "",
      is_public: (settingsResult.data as any).is_public,
      leaderboard_opt_in: settingsResult.leaderboard_opt_in,
      weekly_digest_opt_in: settingsResult.weekly_digest_opt_in,
      pinned_repos: settingsResult.pinned_repos,
      has_wakatime_key: !!settingsResult.wakatime_api_key_encrypted && !!settingsResult.wakatime_api_key_iv,
      discord_webhook_url: settingsResult.discord_webhook_url,
      timezone: settingsResult.timezone,
    });
  }

  // Query only supported columns in the returning select statement
  const selectCols = ["id", "github_login", "is_public"];
  if (hasBio) selectCols.push("bio");
  if (hasLeaderboardOptIn) selectCols.push("leaderboard_opt_in");
  if (hasWeeklyDigestOptIn) selectCols.push("weekly_digest_opt_in");
  if (hasPinnedRepos) selectCols.push("pinned_repos");
  if (hasWakatimeKey) {
    selectCols.push("wakatime_api_key_encrypted");
    selectCols.push("wakatime_api_key_iv");
  }
  if (hasDiscordSettings) selectCols.push("discord_webhook_url", "timezone");

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
    bio: (updated as any).bio ?? "",
    is_public: (updated as any).is_public,
    leaderboard_opt_in: (updated as any).leaderboard_opt_in ?? false,
    weekly_digest_opt_in: (updated as any).weekly_digest_opt_in ?? false,
    pinned_repos: (updated as any).pinned_repos || [],
    has_wakatime_key: !!(updated as any).wakatime_api_key_encrypted && !!(updated as any).wakatime_api_key_iv,
    discord_webhook_url: (updated as any).discord_webhook_url,
    timezone: (updated as any).timezone || "UTC",
  });
}
