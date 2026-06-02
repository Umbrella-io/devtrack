export const dynamic = "force-dynamic";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import BadgeSection from "@/components/BadgeSection";
import GitHubAchievements from "@/components/GitHubAchievements";
import StatsCard from "@/components/StatsCard";
import ShareProfileSection from "@/components/ShareProfileSection";
import ThemeToggle from "@/components/ThemeToggle";
import SponsorBadge from "@/components/SponsorBadge";
import PinnedReposWidget from "@/components/PinnedReposWidget";

import { getUserByUsername, getUserByGithubId } from "@/lib/supabase";

import {
  fetchPublicProfile,
  type PublicProfileData,
} from "@/lib/public-profile-data";

import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";

// Extend tracking structures
interface ExtendedPublicProfileData extends PublicProfileData {
  userId: string;
  isNightOwl: boolean;
  isEarlyBird: boolean;
}

// -------------------------------
// Fetch profile
// -------------------------------
async function fetchPublicProfileForPage(username: string) {
  const user = await getUserByUsername(username);
  if (!user) return null;

  const canonicalUsername = user.github_login.toLowerCase();
  if (username !== canonicalUsername) {
    redirect(`/u/${canonicalUsername}`);
  }

  const base = await fetchPublicProfile(username, {
    includeAchievements: true,
  });

  if (!base) return null;

  let nightOwlCount = 0;
  let earlyBirdCount = 0;

  (base.repos || []).forEach((repo: any) => {
    if (repo.last_commit_date || repo.updatedAt) {
      const commitHour = new Date(
        repo.last_commit_date || repo.updatedAt
      ).getHours();

      if (commitHour >= 0 && commitHour <= 4) nightOwlCount++;
      if (commitHour >= 5 && commitHour <= 8) earlyBirdCount++;
    }
  });

  return {
    ...base,
    userId: user.id,
    isNightOwl: nightOwlCount >= 1,
    isEarlyBird: earlyBirdCount >= 1,
  };
}

// -------------------------------
// Logged-in user
// -------------------------------
async function getLoggedInGitHubUsername() {
  const session = await getServerSession(authOptions);

  if (typeof session?.githubLogin === "string" && session.githubLogin.trim()) {
    return session.githubLogin;
  }

  if (typeof session?.githubId === "string" && session.githubId.trim()) {
    const user = await getUserByGithubId(session.githubId);
    return user?.github_login ?? null;
  }

  return null;
}

// -------------------------------
// Profile URL helper
// -------------------------------
function getProfileUrl(username: string) {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";

  return `${baseUrl}/u/${username}`;
}

// -------------------------------
// Metadata
// -------------------------------
export async function generateMetadata({
  params,
}: {
  params: { username: string };
}): Promise<Metadata> {
  const { username } = params;

  const user = await getUserByUsername(username);
  const profileUrl = getProfileUrl(username);

  if (!user) {
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

// -------------------------------
// Page
// -------------------------------
export default async function PublicProfilePage({
  params,
}: {
  params: { username: string };
}) {
  const { username } = params;

  const profile = await fetchPublicProfileForPage(username);
  const profileUrl = getProfileUrl(username);

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <h1>Profile Not Found</h1>
      </div>
    );
  }

  const avatarUrl = `https://avatars.githubusercontent.com/${profile.username}`;
  const topRepo = profile.repos?.[0]?.name ?? "";

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="mb-8 flex justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            @{profile.username}&apos;s Profile
            {profile.isSponsor && <SponsorBadge />}
          </h1>
          <p>GitHub activity and coding stats</p>
        </div>

        <div className="flex gap-3 items-center">
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

      <ShareProfileSection
        username={profile.username}
        streak={profile.streak.current}
        profileUrl={profileUrl}
      />

      {/* Contribution Graph */}
      <div className="mt-6">
        <PublicContributionGraph data={profile.contributions} />
      </div>

      {/* Streak */}
      <div className="mt-6">
        <PublicStreakTracker streak={profile.streak} />
      </div>

      {/* Repos */}
      <div className="mt-6">
        <PublicTopRepos repos={profile.repos} />
      </div>

      {/* Achievements */}
      <div className="mt-6">
        <GitHubAchievements
          achievements={profile.achievements}
          error={profile.achievementsError}
        />
      </div>

      {/* Badge */}
      <div className="mt-6">
        <BadgeSection username={profile.username} />
      </div>
    </div>
  );
}