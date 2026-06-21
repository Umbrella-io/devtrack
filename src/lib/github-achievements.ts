import { supabaseAdmin } from "@/lib/supabase";

const GITHUB_GRAPHQL_API = "https://api.github.com/graphql";
const GITHUB_WEB_URL = "https://github.com";
const ACHIEVEMENT_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const GITHUB_WEB_HEADERS = {
  Accept: "text/html,application/xhtml+xml",
  "User-Agent": "DevTrack achievement sync",
};

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

export interface SyncAchievementsArgs {
  userId: string;
  githubLogin: string;
  token: string;
  force?: boolean;
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

function logGitHubAchievements(
  level: "error" | "warn" | "info",
  payload: Record<string, unknown>
): void {
  const message = JSON.stringify({
    event: "github_achievements_sync",
    timestamp: new Date().toISOString(),
    ...payload,
  });

  if (level === "error") {
    console.error(message);
  } else if (level === "warn") {
    console.warn(message);
  } else {
    console.info(message);
  }
}

export function decodeHtml(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

export function stripTags(value: string): string {
  return decodeHtml(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

export function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function slugFromTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function achievementDescription(slug: string, title: string): string {
  return ACHIEVEMENT_DESCRIPTIONS[slug] ?? `${title} achievement on GitHub.`;
}

export function absoluteGitHubUrl(value: string): string {
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

export function getHtmlAttribute(tag: string, attribute: string): string | null {
  const pattern = new RegExp(`${attribute}="([^"]*)"`, "i");
  const match = tag.match(pattern);
  return match?.[1] ? decodeHtml(match[1]) : null;
}

export function slugFromAchievementImage(imageUrl: string): string | null {
  const fileName = imageUrl.split("/").pop()?.split("?")[0] ?? "";
  const match = fileName.match(/^(.+?)(?:-(?:default|badge|dark|light))?-[a-f0-9]{6,}\.png$/i);
  return match?.[1]?.toLowerCase() ?? null;
}

export function sanitizeGitHubLogin(username: string): string {
  return username.trim().replace(/^@/, "");
}

async function fetchCanonicalGitHubUser(
  username: string,
  token: string
): Promise<{ login: string; url: string }> {
  const fallback = {
    login: sanitizeGitHubLogin(username),
    url: `${GITHUB_WEB_URL}/${encodeURIComponent(sanitizeGitHubLogin(username))}`,
  };

  try {
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
        variables: { login: fallback.login },
      }),
      cache: "no-store",
    });

    if (!response.ok) return fallback;

    const data = (await response.json()) as GitHubUserGraphQLResponse;
    return data.data?.user ?? fallback;
  } catch {
    return fallback;
  }
}

function parseAchievementsFromProfileHtml(
  html: string,
  githubProfileUrl: string
): GitHubAchievement[] {
  const achievements = new Map<string, GitHubAchievement>();
  const anchorPattern =
    /<a\b[^>]*href="([^"]*\/achievements\/([^"?/#]+)[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(anchorPattern)) {
    const slug = decodeHtml(match[2]).toLowerCase();
    const anchorHtml = match[3];
    const imgMatch = anchorHtml.match(/<img alt="" aria-hidden="true"\b[^>]*src="([^"]+)"[^>]*>/i);

    if (!imgMatch) continue;

    const imageUrl = absoluteGitHubUrl(imgMatch[1]);
    const rawTitle = anchorHtml.match(/title="([^"]+)"/i)?.[1] ?? titleFromSlug(slug);
    const title = stripTags(rawTitle.replace(/^Achievement:\s*/i, ""));

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
  token: string
): Promise<GitHubAchievement[]> {
  const user = await fetchCanonicalGitHubUser(username, token);
  const response = await fetch(user.url, {
    headers: GITHUB_WEB_HEADERS,
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`GitHub profile fetch error: ${response.status}`);

  const html = await response.text();
  return parseAchievementsFromProfileHtml(html, user.url);
}

export async function getCachedGitHubAchievements(
  userId: string
): Promise<GitHubAchievementsCache | null> {
  if (!supabaseAdmin) return null;
  const { data, error } = await supabaseAdmin
    .from("user_github_achievements")
    .select("achievements,synced_at,fetch_error")
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;

  const row = data as GitHubAchievementRow;
  return {
    achievements: row.achievements ?? [],
    syncedAt: row.synced_at,
    error: row.fetch_error ?? null,
  };
}

export async function syncGitHubAchievementsForUser(
  args: SyncAchievementsArgs
): Promise<GitHubAchievementsCache> {
  const { userId, githubLogin, token, force } = args;
  const cached = await getCachedGitHubAchievements(userId);
  const syncedAt = cached?.syncedAt ? new Date(cached.syncedAt).getTime() : 0;

  if (
    !force &&
    cached &&
    (!cached.error || cached.achievements.length > 0) &&
    Date.now() - syncedAt < ACHIEVEMENT_CACHE_TTL_MS
  ) {
    return cached;
  }

  if (!supabaseAdmin) {
    return { achievements: cached?.achievements ?? [], syncedAt: null, error: "Supabase not configured" };
  }

  try {
    const achievements = await fetchGitHubAchievements(githubLogin, token);
    const now = new Date().toISOString();
    
    await supabaseAdmin.from("user_github_achievements").upsert({
      user_id: userId,
      github_login: githubLogin,
      achievements,
      synced_at: now,
      fetch_error: null,
      updated_at: now,
    }, { onConflict: "user_id" });

    return { achievements, syncedAt: now, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to sync";
    return {
      achievements: cached?.achievements ?? [],
      syncedAt: cached?.syncedAt ?? null,
      error: message,
    };
  }
}
