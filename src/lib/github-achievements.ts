import { supabaseAdmin } from "@/lib/supabase";

const GITHUB_GRAPHQL_API = "https://api.github.com/graphql";
const GITHUB_WEB_URL = "https://github.com";
const ACHIEVEMENT_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export interface GitHubAchievement {
  slug: string;
  title: string;
  description: string;
  imageUrl: string;
  url: string;
}

export interface GitHubAchievementsCache {
  achievements: GitHubAchievement[];
  syncedAt: string | null;
  error?: string | null;
}

interface GitHubUserGraphQLResponse {
  data?: {
    user?: {
      login: string;
      url: string;
    } | null;
  };
  errors?: Array<{ message?: string }>;
}

interface GitHubAchievementRow {
  achievements: GitHubAchievement[] | null;
  synced_at: string | null;
  fetch_error?: string | null;
}

const ACHIEVEMENT_DESCRIPTIONS: Record<string, string> = {
  "arctic-code-vault-contributor":
    "Contributed code to repositories preserved in the 2020 GitHub Arctic Code Vault.",
  "galaxy-brain": "Answered discussions with replies marked as accepted.",
  "pair-extraordinaire": "Coauthored commits that were merged into a repository.",
  "pull-shark": "Opened pull requests that were merged.",
  quickdraw: "Closed an issue or pull request shortly after opening it.",
  starstruck: "Created a repository that earned stars.",
  yolo: "Merged a pull request without a review.",
};

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(value: string): string {
  return decodeHtml(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function achievementDescription(slug: string, title: string): string {
  return ACHIEVEMENT_DESCRIPTIONS[slug] ?? `${title} achievement on GitHub.`;
}

function absoluteGitHubUrl(value: string): string {
  const decoded = decodeHtml(value);
  if (decoded.startsWith("http://") || decoded.startsWith("https://")) {
    return decoded;
  }
  if (decoded.startsWith("//")) {
    return `https:${decoded}`;
  }
  if (decoded.startsWith("/")) {
    return `${GITHUB_WEB_URL}${decoded}`;
  }
  return decoded;
}

async function fetchCanonicalGitHubUser(
  username: string,
  token?: string
): Promise<{ login: string; url: string }> {
  if (!token) {
    return {
      login: username,
      url: `${GITHUB_WEB_URL}/${encodeURIComponent(username)}`,
    };
  }

  const response = await fetch(GITHUB_GRAPHQL_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github+json",
    },
    body: JSON.stringify({
      query: `
        query DevTrackGitHubAchievementsUser($login: String!) {
          user(login: $login) {
            login
            url
          }
        }
      `,
      variables: { login: username },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`GitHub GraphQL API error: ${response.status}`);
  }

  const data = (await response.json()) as GitHubUserGraphQLResponse;
  const user = data.data?.user;

  if (!user) {
    throw new Error(data.errors?.[0]?.message ?? "GitHub user not found");
  }

  return user;
}

function parseAchievementsFromProfileHtml(
  html: string,
  githubProfileUrl: string
): GitHubAchievement[] {
  const achievements = new Map<string, GitHubAchievement>();
  const anchorPattern =
    /<a\b[^>]*href="([^"]*\/achievements\/([^"?/#]+)[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(anchorPattern)) {
    const href = match[1];
    const slug = decodeHtml(match[2]).toLowerCase();
    const anchorHtml = match[3];
    const imgMatch = anchorHtml.match(/<img\b[^>]*src="([^"]+)"[^>]*>/i);

    if (!imgMatch) {
      continue;
    }

    const imageUrl = absoluteGitHubUrl(imgMatch[1]);
    const altMatch = anchorHtml.match(/<img\b[^>]*alt="([^"]*)"[^>]*>/i);
    const ariaMatch = anchorHtml.match(/aria-label="([^"]+)"/i);
    const titleMatch = anchorHtml.match(/title="([^"]+)"/i);
    const rawTitle =
      altMatch?.[1] || ariaMatch?.[1] || titleMatch?.[1] || titleFromSlug(slug);
    const title = stripTags(rawTitle.replace(/^Achievement:\s*/i, "")) || titleFromSlug(slug);

    achievements.set(slug, {
      slug,
      title,
      description: achievementDescription(slug, title),
      imageUrl,
      url: githubProfileUrl,
    });
  }

  return [...achievements.values()].sort((a, b) => a.title.localeCompare(b.title));
}

export async function fetchGitHubAchievements(
  username: string,
  token?: string
): Promise<GitHubAchievement[]> {
  const user = await fetchCanonicalGitHubUser(username, token);
  const response = await fetch(user.url, {
    headers: {
      Accept: "text/html",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`GitHub profile fetch error: ${response.status}`);
  }

  const html = await response.text();
  return parseAchievementsFromProfileHtml(html, user.url);
}

export async function getCachedGitHubAchievements(
  userId: string
): Promise<GitHubAchievementsCache | null> {
  const { data, error } = await supabaseAdmin
    .from("user_github_achievements")
    .select("achievements,synced_at,fetch_error")
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("Error fetching GitHub achievements cache:", error);
    return null;
  }

  const row = data as GitHubAchievementRow;

  return {
    achievements: row.achievements ?? [],
    syncedAt: row.synced_at,
    error: row.fetch_error ?? null,
  };
}

export async function syncGitHubAchievementsForUser(options: {
  userId: string;
  githubLogin: string;
  token?: string;
  force?: boolean;
}): Promise<GitHubAchievementsCache> {
  const cached = await getCachedGitHubAchievements(options.userId);
  const syncedAt = cached?.syncedAt ? new Date(cached.syncedAt).getTime() : 0;

  if (
    !options.force &&
    cached &&
    Number.isFinite(syncedAt) &&
    Date.now() - syncedAt < ACHIEVEMENT_CACHE_TTL_MS
  ) {
    return cached;
  }

  try {
    const achievements = await fetchGitHubAchievements(
      options.githubLogin,
      options.token
    );
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin.from("user_github_achievements").upsert(
      {
        user_id: options.userId,
        github_login: options.githubLogin,
        achievements,
        synced_at: now,
        fetch_error: null,
        updated_at: now,
      },
      { onConflict: "user_id" }
    );

    if (error) {
      throw error;
    }

    return { achievements, syncedAt: now, error: null };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to sync GitHub achievements";
    const now = new Date().toISOString();

    const { error: updateError } = await supabaseAdmin
      .from("user_github_achievements")
      .upsert(
        {
          user_id: options.userId,
          github_login: options.githubLogin,
          achievements: cached?.achievements ?? [],
          synced_at: cached?.syncedAt ?? now,
          fetch_error: message,
          updated_at: now,
        },
        { onConflict: "user_id" }
      );

    if (updateError) {
      console.error("Error updating GitHub achievements sync status:", updateError);
    }

    return {
      achievements: cached?.achievements ?? [],
      syncedAt: cached?.syncedAt ?? null,
      error: message,
    };
  }
}
