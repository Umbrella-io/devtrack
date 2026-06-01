/**
 * OpenGraph Metadata Generator for Public Profile Pages
 *
 * Generates og:title, og:description, og:image metadata
 * for /u/[username] pages to enable rich social previews.
 */

export interface ProfileOGData {
  username: string;
  displayName?: string;
  avatarUrl?: string;
  topLanguage?: string;
  currentStreak?: number;
  totalCommits?: number;
  bio?: string;
}

/**
 * Generate Next.js Metadata for a public profile page.
 */
export function generateProfileMetadata(data: ProfileOGData) {
  const {
    username,
    displayName,
    avatarUrl,
    topLanguage,
    currentStreak = 0,
    totalCommits = 0,
    bio,
  } = data;

  const name = displayName || username;
  const title = `${name} (@${username}) | DevTrack`;
  const description =
    bio ||
    `Check out ${name}'s coding stats on DevTrack: ${currentStreak} day streak, ${totalCommits} commits${topLanguage ? `, top language: ${topLanguage}` : ""}.`;

  const ogImageUrl = `/api/public/${username}/og-image`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://devtrack.app/u/${username}`,
      siteName: "DevTrack",
      images: avatarUrl
        ? [{ url: ogImageUrl, width: 1200, height: 630, alt: `${name}'s DevTrack Profile` }]
        : [],
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: avatarUrl ? [ogImageUrl] : [],
      creator: `@${username}`,
    },
  };
}
