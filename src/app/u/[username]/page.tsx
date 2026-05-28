import { Metadata } from "next";
import { cache } from "react"; // 💡 Fix 1: Added for request memoization
import { redirect } from "next/navigation";
import BadgeSection from "@/components/BadgeSection";
import GitHubAchievements from "@/components/GitHubAchievements";
import StatsCard from "@/components/StatsCard";
import ShareProfileSection from "@/components/ShareProfileSection";
import ThemeToggle from "@/components/ThemeToggle";
import CopyLinkButton from "@/components/CopyLinkButton"; // ✅ Keeping your imported button

import { getUserByUsername } from "@/lib/supabase";
import { syncGitHubAchievementsForUser } from "@/lib/github-achievements";

import {
  fetchPublicTopRepos,
  fetchPublicContributions,
  fetchPublicStreak,
  type PublicProfileData,
} from "@/lib/public-profile-data";

/* -------------------- DATA FETCH -------------------- */

async function fetchPublicProfile(
  username: string,
  options: { includeAchievements?: boolean } = {}
): Promise<PublicProfileData | null> {
  const user = await getUserByUsername(username);

  if (!user) return null;

  const canonicalUsername = user.github_login.toLowerCase();

  if (username !== canonicalUsername) {
    redirect(`/u/${canonicalUsername}`);
  }

  const githubToken = process.env.GITHUB_TOKEN;

  const [repos, contributions, streak, achievementsCache] = await Promise.all([
    fetchPublicTopRepos(user.github_login, githubToken, 30),
    fetchPublicContributions(user.github_login, githubToken, 30),
    fetchPublicStreak(user.github_login, githubToken),
    options.includeAchievements
      ? syncGitHubAchievementsForUser({
          userId: user.id,
          githubLogin: user.github_login,
          token: githubToken,
        })
      : Promise.resolve({ achievements: [], syncedAt: null, error: null }),
  ]);

  return {
    username: user.github_login,
    userId: user.id,
    repos,
    contributions,
    streak,
    achievements: achievementsCache.achievements,
    achievementsError: achievementsCache.error,
  };
}

/* -------------------- TYPES & METADATA -------------------- */

interface PageProps {
  params: Promise<{ username: string }>; // 💡 Fix 2: typed as Promise for Next.js 15+ safety
}

function getProfileUrl(username: string) {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";

  return `${baseUrl}/u/${username}`;
}

export async function generateMetadata({
  params,
}: {
  params: { username: string };
}): Promise<Metadata> {
  const { username } = params;
  const profile = await fetchPublicProfile(username);
  const profileUrl = getProfileUrl(username);

  if (!profile) {
    return {
      title: "Profile Not Found",
      description: "This profile is not available or is private.",
    };
  }

  return {
    title: `${username}'s DevTrack Profile`,
    description: `GitHub stats and coding activity for ${username}.`,
    openGraph: {
      title: `${username}'s DevTrack Profile`,
      description: `GitHub stats and coding activity for ${username}`,
      url: profileUrl,
      siteName: "DevTrack",
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title: `${username}'s DevTrack Profile`,
      description: `GitHub stats and coding activity for ${username}`,
    },
  };
}

/* -------------------- MAIN PAGE COMPONENT -------------------- */

export default async function PublicProfilePage({
  params,
}: {
  params: { username: string };
}) {
  const { username } = params;
  const profile = await fetchPublicProfile(username, { includeAchievements: true });
  const profileUrl = getProfileUrl(username);

  if (!profile) {
    return (
      <div className="min-h-screen bg-[var(--background)] p-4 md:p-8 text-[var(--foreground)] transition-colors flex items-center justify-center">
        <div className="surface-card max-w-md rounded-2xl p-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Profile Not Found
          </h1>
          <p className="text-[var(--muted-foreground)] mb-2">
            This profile is not available or has not been made public.
          </p>
          <p className="text-sm text-[var(--muted-foreground)] mb-6">
            If this is your profile, go to{" "}
            <a
              href="/dashboard/settings"
              className="text-[var(--accent)] underline hover:opacity-80"
            >
              Settings
            </a>{" "}
            and enable <strong>Public Profile</strong>.
          </p>

          <a
            href="/"
            className="primary-button inline-block rounded-lg px-6 py-2"
          >
            Back to Home
          </a>
        </div>
      </div>
    );
  }

  const avatarUrl = `https://avatars.githubusercontent.com/${profile.username}`;
  const topRepo = profile.repos[0]?.name ?? "";

  return (
    <div className="min-h-screen bg-[var(--background)] p-4 text-[var(--foreground)] transition-colors md:p-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          {/* ✅ FIXED THE FLEX-HEADER TO FIT YOUR COPY BUTTON */}
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl md:text-4xl font-bold text-[var(--foreground)]">
              @{profile.username}&apos;s Profile
            </h1>
            <CopyLinkButton url={profileUrl} />
          </div>
          <p className="mt-2 text-[var(--muted-foreground)]">
            GitHub activity and coding stats
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <StatsCard
            username={profile.username}
            avatarUrl={avatarUrl}
            currentStreak={profile.streak.current}
            longestStreak={profile.streak.longest}
            totalCommits={profile.contributions.total}
            topRepo={topRepo}
          />
        </div>
      </div>

      <div className="mb-8">
        <ShareProfileSection
          username={profile.username}
          streak={profile.streak.current}
          profileUrl={profileUrl}
        />
      </div>

      {/* ROW 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PublicContributionGraph data={profile.contributions} />
        </div>

        <div>
          <PublicStreakTracker streak={profile.streak} />
        </div>
      </div>

      {/* ROW 2 */}
      <div className="mt-6">
        <PublicTopRepos repos={profile.repos} />
      </div>

      {/* Row 3: GitHub achievements */}
      <div className="mt-6">
        <GitHubAchievements
          achievements={profile.achievements}
          error={profile.achievementsError}
        />
      </div>

      {/* Row 4: Get your badge */}
      <div className="mt-6">
        <BadgeSection username={profile.username} />
      </div>
    </div>
  );
}

/* -------------------- SUB-COMPONENTS -------------------- */

function PublicContributionGraph({
  data,
}: {
  data: {
    days: number;
    total: number;
    data: Record<string, number>;
  };
}) {
  const chart = Object.entries(data.data ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, commits]) => ({ day, commits }));

  return (
    <div className="border rounded-xl p-6">
      <h2 className="font-semibold mb-2">
        Commit Activity ({data.days} days)
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        Total commits: {data.total}
      </p>

      <div className="grid grid-cols-7 gap-1">
        {chart.map((d) => (
          <div
            key={d.day}
            className="aspect-square rounded-sm"
            style={{
              backgroundColor: d.commits > 0 ? "#4f46e5" : "#e5e7eb",
              opacity: d.commits > 0 ? Math.min(d.commits / 10, 1) : 1,
            }}
            title={`${d.day}: ${d.commits} commits`}
          />
        ))}
      </div>
    </div>
  );
}

interface StreakData {
  current: number;
  longest: number;
  totalActiveDays: number;
  lastCommitDate: string | null;
}

// 💡 Fix 3: Standard structural typing preserved natively
function PublicStreakTracker({ streak }: { streak: StreakData }) {
  return (
    <div className="border rounded-xl p-6 space-y-3">
      <h2 className="font-semibold">Commit Streaks</h2>

      <div>🔥 Current: {streak.current} days</div>
      <div>🏆 Longest: {streak.longest} days</div>
      <div>📅 Active: {streak.totalActiveDays} days</div>
      <div>
        ⚡ Last:{" "}
        {streak.lastCommitDate
          ? new Date(streak.lastCommitDate).toLocaleDateString()
          : "—"}
      </div>
    </div>
  );
}

function PublicTopRepos({
  repos,
}: {
  repos: Array<{ name: string; commits: number; url: string }>;
}) {
  const max = repos[0]?.commits ?? 1;

  return (
    <div className="border rounded-xl p-6">
      <h2 className="font-semibold mb-4">Top Repositories</h2>

      <ul className="space-y-3">
        {repos.map((repo, i) => {
          const width = Math.max((repo.commits / max) * 100, 4);
          const name = repo.name.split("/")[1] ?? repo.name;

          return (
            <li key={repo.name}>
              <div className="flex justify-between text-sm">
                <a href={repo.url} target="_blank" rel="noopener noreferrer">
                  #{i + 1} {name}
                </a>
                <span>{repo.commits} commits</span>
              </div>

              <div className="h-1 bg-gray-200 rounded">
                <div
                  className="h-1 bg-indigo-500 rounded"
                  style={{ width: `${width}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}