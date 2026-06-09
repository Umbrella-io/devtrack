import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveAppUser } from "@/lib/resolve-user";
import { encryptToken } from "@/lib/crypto";
import { validateTextInput } from "@/lib/sanitize";
import { clearLeaderboardCache } from "@/lib/leaderboard";
import { cacheGet, cacheSet, cacheDelete } from "@/lib/metrics-cache";
import {
  defaultLocale,
  isValidLocale,
  localeCookieMaxAge,
  localeCookieName,
} from "@/i18n/config";

export const dynamic = "force-dynamic";

const VALID_WIDGETS = ["streak", "contributions", "languages", "prs"] as const;
type WidgetKey = (typeof VALID_WIDGETS)[number];

function sanitizePublicWidgets(input: unknown): WidgetKey[] {
  if (!Array.isArray(input)) return ["streak", "contributions"];
  return input.filter((w): w is WidgetKey =>
    typeof w === "string" && (VALID_WIDGETS as readonly string[]).includes(w)
  );
}

async function fetchUserSettings(userId: string) {
  // Tier 1: All columns (including public_widgets added by 20260608000000 migration)
  const res1 = await supabaseAdmin
    .from("users")
    .select("id, github_login, bio, is_public, public_since, show_weekly_goals, leaderboard_opt_in, pinned_repos, wakatime_api_key_encrypted, wakatime_api_key_iv, weekly_digest_opt_in, discord_webhook_url, timezone, webhook_url, discord_muted_until, public_widgets")
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
      hasWebhookUrl: true,
      hasDiscordMutedUntil: true,
      hasPublicWidgets: true,
      leaderboard_opt_in: (res1.data as any).leaderboard_opt_in ?? false,
      weekly_digest_opt_in: (res1.data as any).weekly_digest_opt_in ?? false,
      pinned_repos: (res1.data as any).pinned_repos || [],
      wakatime_api_key_encrypted: (res1.data as any).wakatime_api_key_encrypted || null,
      wakatime_api_key_iv: (res1.data as any).wakatime_api_key_iv || null,
      discord_webhook_url: (res1.data as any).discord_webhook_url || null,
      timezone: (res1.data as any).timezone || "UTC",
      webhook_url: (res1.data as any).webhook_url || null,
      discord_muted_until: (res1.data as any).discord_muted_until || null,
      public_widgets: sanitizePublicWidgets((res1.data as any).public_widgets),
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
      hasWebhookUrl: false,
      hasDiscordMutedUntil: false,
      hasPublicWidgets: false,
      leaderboard_opt_in: false,
      weekly_digest_opt_in: false,
      pinned_repos: [] as string[],
      wakatime_api_key_encrypted: null,
      wakatime_api_key_iv: null,
      discord_webhook_url: null,
      timezone: "UTC",
      webhook_url: null,
      discord_muted_until: null,
      public_widgets: ["streak", "contributions"] as WidgetKey[],
    };
  }

  // Tier 2: Without public_widgets (deployments that haven't run the latest migration yet)
  const res2 = await supabaseAdmin
    .from("users")
    .select("id, github_login, bio, is_public, public_since, show_weekly_goals, leaderboard_opt_in, pinned_repos, wakatime_api_key_encrypted, wakatime_api_key_iv, weekly_digest_opt_in, discord_webhook_url, timezone, webhook_url, discord_muted_until")
    .eq("id", userId)
    .single();

  if (!res2.error) {
    return {
      data: res2.data as any,
      error: null,
      hasLeaderboardOptIn: true,
      hasPinnedRepos: true,
      hasWakatimeKey: true,
      hasWeeklyDigestOptIn: true,
      hasDiscordSettings: true,
      hasBio: true,
      hasWebhookUrl: true,
      hasDiscordMutedUntil: true,
      hasPublicWidgets: false,
      leaderboard_opt_in: (res2.data as any).leaderboard_opt_in ?? false,
      weekly_digest_opt_in: (res2.data as any).weekly_digest_opt_in ?? false,
      pinned_repos: (res2.data as any).pinned_repos || [],
      wakatime_api_key_encrypted: (res2.data as any).wakatime_api_key_encrypted || null,
      wakatime_api_key_iv: (res2.data as any).wakatime_api_key_iv || null,
      discord_webhook_url: (res2.data as any).discord_webhook_url || null,
      timezone: (res2.data as any).timezone || "UTC",
      webhook_url: (res2.data as any).webhook_url || null,
      discord_muted_until: (res2.data as any).discord_muted_until || null,
      public_widgets: ["streak", "contributions"] as WidgetKey[],
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
      hasWebhookUrl: false,
      hasDiscordMutedUntil: false,
      hasPublicWidgets: false,
      leaderboard_opt_in: false,
      weekly_digest_opt_in: false,
      pinned_repos: [] as string[],
      wakatime_api_key_encrypted: null,
      wakatime_api_key_iv: null,
      discord_webhook_url: null,
      timezone: "UTC",
      webhook_url: null,
      discord_muted_until: null,
      public_widgets: ["streak", "contributions"] as WidgetKey[],
    };
  }

  // Tier 3: Without bio, for deployments that have not run the latest migration.
  const res3 = await supabaseAdmin
    .from("users")
      .select("id, github_login, is_public, public_since, show_weekly_goals, leaderboard_opt_in, pinned_repos, wakatime_api_key_encrypted, wakatime_api_key_iv, webhook_url")
    .eq("id", userId)
    .single();

  if (!res3.error) {
    return {
      data: res3.data as any,
      error: null,
      hasLeaderboardOptIn: true,
      hasPinnedRepos: true,
      hasWakatimeKey: true,
      hasWeeklyDigestOptIn: false,
      hasDiscordSettings: false,
      hasBio: false,
      hasWebhookUrl: true,
      hasDiscordMutedUntil: false,
      hasPublicWidgets: false,
      leaderboard_opt_in: (res3.data as any).leaderboard_opt_in ?? false,
      weekly_digest_opt_in: false,
      pinned_repos: (res3.data as any).pinned_repos || [],
      wakatime_api_key_encrypted: (res3.data as any).wakatime_api_key_encrypted || null,
      wakatime_api_key_iv: (res3.data as any).wakatime_api_key_iv || null,
      discord_webhook_url: null,
      timezone: "UTC",
      webhook_url: (res3.data as any).webhook_url || null,
      discord_muted_until: null,
      public_widgets: ["streak", "contributions"] as WidgetKey[],
    };
  }

  if (res3.error.code !== "42703") {
    return {
      data: null,
      error: res3.error,
      hasLeaderboardOptIn: false,
      hasPinnedRepos: false,
      hasWakatimeKey: false,
      hasWeeklyDigestOptIn: false,
      hasDiscordSettings: false,
      hasBio: false,
      hasWebhookUrl: false,
      hasDiscordMutedUntil: false,
      hasPublicWidgets: false,
      leaderboard_opt_in: false,
      weekly_digest_opt_in: false,
      pinned_repos: [] as string[],
      wakatime_api_key_encrypted: null,
      wakatime_api_key_iv: null,
      discord_webhook_url: null,
      timezone: "UTC",
      webhook_url: null,
      discord_muted_until: null,
      public_widgets: ["streak", "contributions"] as WidgetKey[],
    };
  }

  // Tier 4: Without public_since and show_weekly_goals (added by migrations)
  const res4 = await supabaseAdmin
    .from("users")
      .select("id, github_login, is_public, public_since, show_weekly_goals")
    .eq("id", userId)
    .single();

  if (!res4.error) {
    return {
      data: res4.data as any,
      error: null,
      hasLeaderboardOptIn: false,
      hasPinnedRepos: false,
      hasWakatimeKey: false,
      hasWeeklyDigestOptIn: false,
      hasDiscordSettings: false,
      hasBio: false,
      hasDiscordMutedUntil: false,
      hasPublicWidgets: false,
      leaderboard_opt_in: false,
      weekly_digest_opt_in: false,
      pinned_repos: [] as string[],
      wakatime_api_key_encrypted: null,
      wakatime_api_key_iv: null,
      discord_webhook_url: null,
      timezone: "UTC",
      webhook_url: null,
      discord_muted_until: null,
      public_widgets: ["streak", "contributions"] as WidgetKey[],
    };
  }

  if (res4.error.code !== "42703") {
    return {
      data: null,
      error: res4.error,
      hasLeaderboardOptIn: false,
      hasPinnedRepos: false,
      hasWakatimeKey: false,
      hasWeeklyDigestOptIn: false,
      hasDiscordSettings: false,
      hasBio: false,
      hasDiscordMutedUntil: false,
      hasPublicWidgets: false,
      leaderboard_opt_in: false,
      weekly_digest_opt_in: false,
      pinned_repos: [] as string[],
      wakatime_api_key_encrypted: null,
      wakatime_api_key_iv: null,
      discord_webhook_url: null,
      timezone: "UTC",
      discord_muted_until: null,
      public_widgets: ["streak", "contributions"] as WidgetKey[],
    };
  }

  // Tier 5: Absolute minimum — columns guaranteed in every schema version
  const res5 = await supabaseAdmin
    .from("users")
      .select("id, github_login, is_public")
    .eq("id", userId)
    .single();

  if (!res5.error) {
    return {
      data: res5.data as any,
      error: null,
      hasLeaderboardOptIn: false,
      hasPinnedRepos: false,
      hasWakatimeKey: false,
      hasWeeklyDigestOptIn: false,
      hasDiscordSettings: false,
      hasBio: false,
      hasDiscordMutedUntil: false,
      hasPublicWidgets: false,
      leaderboard_opt_in: false,
      weekly_digest_opt_in: false,
      pinned_repos: [] as string[],
      wakatime_api_key_encrypted: null,
      wakatime_api_key_iv: null,
      discord_webhook_url: null,
      timezone: "UTC",
      discord_muted_until: null,
      public_widgets: ["streak", "contributions"] as WidgetKey[],
    };
  }

  return {
    data: null,
    error: res5.error,
    hasLeaderboardOptIn: false,
    hasPinnedRepos: false,
    hasWakatimeKey: false,
    hasWeeklyDigestOptIn: false,
    hasDiscordSettings: false,
    hasBio: false,
    hasDiscordMutedUntil: false,
    hasPublicWidgets: false,
    leaderboard_opt_in: false,
    weekly_digest_opt_in: false,
    pinned_repos: [] as string[],
    wakatime_api_key_encrypted: null,
    wakatime_api_key_iv: null,
    discord_webhook_url: null,
    timezone: "UTC",
    webhook_url: null,
    discord_muted_until: null,
    public_widgets: ["streak", "contributions"] as WidgetKey[],
  };
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.githubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await resolveAppUser(session.githubId, session.githubLogin);
  if (!user) {
    return NextResponse.json({ error: "Failed to fetch user settings" }, { status: 500 });
  }

  const cacheKey = `settings:${user.id}`;
  const SETTINGS_TTL = 5 * 60;

  const cached = await cacheGet<Record<string, unknown>>(cacheKey, SETTINGS_TTL);
  if (cached) {
    return settingsResponse(cached);
  }

  const result = await fetchUserSettings(user.id);

  if (result.error || !result.data) {
    console.error(`Error fetching user settings: code=${result.error?.code} msg=${result.error?.message}`, result.error);
    return NextResponse.json({ error: "Failed to fetch user settings" }, { status: 500 });
  }

  return NextResponse.json({
    id: (result.data as any).id,
    github_login: (result.data as any).github_login,
    bio: (result.data as any).bio ?? "",
    is_public: (result.data as any).is_public,
    public_since: (result.data as any).public_since ?? null,
    show_weekly_goals: (result.data as any).show_weekly_goals ?? false,
    leaderboard_opt_in: result.leaderboard_opt_in,
    weekly_digest_opt_in: result.weekly_digest_opt_in,
    pinned_repos: result.pinned_repos,
    has_wakatime_key: !!result.wakatime_api_key_encrypted && !!result.wakatime_api_key_iv,
    discord_webhook_url: result.discord_webhook_url,
    timezone: result.timezone,
    webhook_url: result.webhook_url ?? null,
    discord_muted_until: result.discord_muted_until ?? null,
    public_widgets: result.public_widgets,
  };

  await cacheSet(cacheKey, response, SETTINGS_TTL);
  return settingsResponse(response);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.githubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await resolveAppUser(session.githubId, session.githubLogin);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let body: {
    is_public?: boolean;
    show_weekly_goals?: boolean;
    leaderboard_opt_in?: boolean;
    weekly_digest_opt_in?: boolean;
    pinned_repos?: string[];
    wakatime_api_key?: string;
    discord_webhook_url?: string | null;
    timezone?: string;
    bio?: string;
    webhook_url?: string | null;
    discord_muted_until?: string | null;
    public_widgets?: string[];
  };
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { is_public, show_weekly_goals, leaderboard_opt_in, weekly_digest_opt_in, pinned_repos, wakatime_api_key, discord_webhook_url, timezone, bio, webhook_url, discord_muted_until, public_widgets } = body;

  const settingsResult = await fetchUserSettings(user.id);
  if (settingsResult.error || !settingsResult.data) {
    console.error("Error fetching settings during PATCH:", settingsResult.error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }

  const { hasLeaderboardOptIn, hasPinnedRepos, hasWakatimeKey, hasWeeklyDigestOptIn, hasDiscordSettings, hasBio, hasWebhookUrl, hasDiscordMutedUntil, hasPublicWidgets } = settingsResult;
  const updates: {
    is_public?: boolean;
    public_since?: string | null;
    show_weekly_goals?: boolean;
    leaderboard_opt_in?: boolean;
    weekly_digest_opt_in?: boolean;
    pinned_repos?: string[];
    wakatime_api_key_encrypted?: string | null;
    wakatime_api_key_iv?: string | null;
    discord_webhook_url?: string | null;
    timezone?: string;
    bio?: string;
    webhook_url?: string | null;
    discord_muted_until?: string | null;
    public_widgets?: WidgetKey[];
  } = {};

  if (is_public !== undefined && is_public !== null && typeof is_public === "boolean") {
    updates.is_public = is_public;
    if (is_public) {
      updates.public_since = new Date().toISOString();
    } else {
      updates.public_since = null;
    }
  }

  if (hasLeaderboardOptIn && leaderboard_opt_in !== undefined && leaderboard_opt_in !== null && typeof leaderboard_opt_in === "boolean") {
    updates.leaderboard_opt_in = leaderboard_opt_in;
    if (leaderboard_opt_in) {
      updates.is_public = true;
    }
  }

  if (show_weekly_goals !== undefined && show_weekly_goals !== null && typeof show_weekly_goals === "boolean") {
    updates.show_weekly_goals = show_weekly_goals;
  }

  if (hasWebhookUrl && (typeof webhook_url === "string" || webhook_url === null)) {
    updates.webhook_url = webhook_url;
  }

  if (hasWeeklyDigestOptIn && weekly_digest_opt_in !== undefined && weekly_digest_opt_in !== null && typeof weekly_digest_opt_in === "boolean") {
    updates.weekly_digest_opt_in = weekly_digest_opt_in;
  }

  if (hasPinnedRepos && pinned_repos !== undefined && pinned_repos !== null && Array.isArray(pinned_repos)) {
    if (pinned_repos.length > 3) {
      return NextResponse.json({ error: "Maximum 3 pins allowed" }, { status: 400 });
    }
    updates.pinned_repos = pinned_repos;
  }

  if (typeof seen_onboarding === "boolean") {
    updates.seen_onboarding = seen_onboarding;
  }

  if (!hasBio && bio !== undefined) {
    return NextResponse.json({ error: "Bio settings are not available until the latest database migration is applied" }, { status: 400 });
  }

  if (hasBio && bio !== undefined) {
    const result = validateTextInput(bio, "Bio", 500);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    updates.bio = result.value;
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
    } catch (e) {
      return NextResponse.json({ error: "Invalid timezone" }, { status: 400 });
    }
  }

  if (hasDiscordMutedUntil && discord_muted_until !== undefined) {
    if (discord_muted_until === null || typeof discord_muted_until === "string") {
      updates.discord_muted_until = discord_muted_until;
    }
  }

  // Handle public_widgets update
  if (hasPublicWidgets && public_widgets !== undefined && Array.isArray(public_widgets)) {
    updates.public_widgets = sanitizePublicWidgets(public_widgets);
  }

  // If there are no updates (or none that are supported by the schema)
  if (Object.keys(updates).length === 0) {
    return settingsResponse({
      id: (settingsResult.data as any).id,
      github_login: (settingsResult.data as any).github_login,
      bio: (settingsResult.data as any).bio ?? "",
      is_public: (settingsResult.data as any).is_public,
      public_since: (settingsResult.data as any).public_since ?? null,
      show_weekly_goals: (settingsResult.data as any).show_weekly_goals ?? false,
      leaderboard_opt_in: settingsResult.leaderboard_opt_in,
      weekly_digest_opt_in: settingsResult.weekly_digest_opt_in,
      pinned_repos: settingsResult.pinned_repos,
      has_wakatime_key: !!settingsResult.wakatime_api_key_encrypted && !!settingsResult.wakatime_api_key_iv,
      discord_webhook_url: settingsResult.discord_webhook_url,
      timezone: settingsResult.timezone,
      webhook_url: settingsResult.webhook_url ?? null,
      discord_muted_until: settingsResult.discord_muted_until ?? null,
      public_widgets: settingsResult.public_widgets,
    });
  }

  const selectCols = ["id", "github_login", "is_public", "public_since", "show_weekly_goals"];
  if (hasBio) selectCols.push("bio");
  if (hasLeaderboardOptIn) selectCols.push("leaderboard_opt_in");
  if (hasWeeklyDigestOptIn) selectCols.push("weekly_digest_opt_in");
  if (hasPinnedRepos) selectCols.push("pinned_repos");
  if (hasWakatimeKey) {
    selectCols.push("wakatime_api_key_encrypted");
    selectCols.push("wakatime_api_key_iv");
  }
  if (hasDiscordSettings) selectCols.push("discord_webhook_url", "timezone");
  if (hasDiscordMutedUntil) selectCols.push("discord_muted_until");
  if (hasWebhookUrl) selectCols.push("webhook_url");
  if (hasPublicWidgets) selectCols.push("public_widgets");

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

  // If is_public or leaderboard_opt_in changed, the cached leaderboard would
  // show stale eligibility until it expires (up to 1 hour). Bust the cache
  // immediately so the next request reflects the updated preference.
  const leaderboardEligibilityChanged =
    "is_public" in updates || "leaderboard_opt_in" in updates;

  if (leaderboardEligibilityChanged) {
    try {
      await clearLeaderboardCache();
    } catch {
      console.error("[settings] Failed to invalidate leaderboard cache after visibility change");
    }
  }

  return settingsResponse({
    id: (updated as any).id,
    github_login: (updated as any).github_login,
    bio: (updated as any).bio ?? "",
    is_public: (updated as any).is_public,
    public_since: (updated as any).public_since ?? null,
    show_weekly_goals: (updated as any).show_weekly_goals ?? false,
    leaderboard_opt_in: (updated as any).leaderboard_opt_in ?? false,
    weekly_digest_opt_in: (updated as any).weekly_digest_opt_in ?? false,
    pinned_repos: (updated as any).pinned_repos || [],
    has_wakatime_key: !!(updated as any).wakatime_api_key_encrypted && !!(updated as any).wakatime_api_key_iv,
    discord_webhook_url: (updated as any).discord_webhook_url,
    timezone: (updated as any).timezone || "UTC",
    webhook_url: (updated as any).webhook_url ?? null,
    discord_muted_until: (updated as any).discord_muted_until ?? null,
    public_widgets: hasPublicWidgets
      ? sanitizePublicWidgets((updated as any).public_widgets)
      : settingsResult.public_widgets,
  });
}