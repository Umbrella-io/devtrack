export const dynamic = "force-dynamic";

import ProfileThemeWrapper from "@/components/ProfileThemeWrapper";
import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import BadgeSection from "@/components/BadgeSection";
import GitHubAchievements from "@/components/GitHubAchievements";
import StatsCard from "@/components/StatsCard";
import ShareProfileSection from "@/components/ShareProfileSection";
import SponsorBadge from "@/components/SponsorBadge";
import PinnedReposWidget from "@/components/PinnedReposWidget";
import CopyLinkButton from "@/components/CopyLinkButton";
import { Moon, Sun } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { getUserByGithubId, getUserByUsername } from "@/lib/supabase";
import {
  fetchPublicProfile as fetchPublicProfileLib,
  type PublicProfileData,
} from "@/lib/public-profile-data";

// Extend tracking structures to forward gamification flags seamlessly downstream
interface ExtendedPublicProfileData extends PublicProfileData {
  userId: string;
  isNightOwl: boolean;
  isEarlyBird: boolean;
}

async function fetchPublicProfile(
  username: string,
  options: { includeAchievements?: boolean } = {}
): Promise<ExtendedPublicProfileData | null> {
  const user = await getUserByUsername(username);

  if (!user) return null;

  const canonicalUsername = user.github_login.toLowerCase();

  if (username !== canonicalUsername) {
    redirect(`/u/${canonicalUsername}`);
  }

  const base = await fetchPublicProfileLib(username, options);

  if (!base) return null;

  // Compute Night Owl / Early Bird from repos
  let nightOwlCount = 0;
  let earlyBirdCount = 0;

  (base.repos || []).forEach((repo: any) => {
    if (repo.last_commit_date || repo.updatedAt) {
      const commitHour = new Date(repo.last_commit_date || repo.updatedAt).getHours();
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
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const user = await getUserByUsername(username);
  const profileUrl = getProfileUrl(username);

  if (!user) {
    return {
      title: "Profile Not Found",
      description: "This profile is not available or is private.",
    };
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";

  // Build dynamic OG image URL
  const ogImageUrl = new URL(`${baseUrl}/api/og/user`);
ogImageUrl.searchParams.set("username", username);
ogImageUrl.searchParams.set("name", username);
ogImageUrl.searchParams.set("avatar", `https://avatars.githubusercontent.com/${username}`);
ogImageUrl.searchParams.set("topLang", "Code");
ogImageUrl.searchParams.set("streak", "0");
ogImageUrl.searchParams.set("commits", "0");

  const title = `${username}'s DevTrack Profile`;
  const description = `GitHub stats and coding activity for ${username}. View commits, streaks, and top repositories.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: profileUrl,
      siteName: "DevTrack",
      type: "profile",
      images: [
        {
          url: ogImageUrl.toString(),
          width: 1200,
          height: 630,
          alt: `${username}'s DevTrack profile`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl.toString()],
    },
  };
}
export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const [profile, loggedInUsername] = await Promise.all([
    fetchPublicProfile(username, { includeAchievements: true }),
    getLoggedInGitHubUsername(),
  ]);
  const profileUrl = getProfileUrl(username);

  if (!profile) {
    return (
      <ProfileThemeWrapper>
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
            <Link
              href="/dashboard/settings"
              className="text-[var(--accent)] underline hover:opacity-80"
            >
              Settings
            </Link>{" "}
            and enable <strong>Public Profile</strong>.
          </p>
          <Link
            href="/"
            className="primary-button inline-block rounded-lg px-6 py-2"
          >
            Back to Home
          </Link>
        </div>
      </div>
      </ProfileThemeWrapper>
    );
  }

  const canonicalUsername = profile.username.toLowerCase();
  if (username !== canonicalUsername) {
    redirect(`/u/${canonicalUsername}`);
  }

  const avatarUrl = `https://avatars.githubusercontent.com/${profile.username}`;
  const topRepo = profile.repos[0]?.name ?? "";
  const gistsUrl = `https://gist.github.com/${profile.username}`;
  const showCompareButton =
    loggedInUsername !== null &&
    loggedInUsername.toLowerCase() !== profile.username.toLowerCase();
  const compareHref = showCompareButton
    ? `/compare/${encodeURIComponent(loggedInUsername)}-vs-${encodeURIComponent(profile.username)}`
    : null;
  const signInToCompareHref = `/auth/signin?callbackUrl=${encodeURIComponent(
    `/u/${profile.username}`
  )}`;

  return (
    <ProfileThemeWrapper>
    <div className="min-h-screen bg-[var(--background)] p-4 text-[var(--foreground)] transition-colors md:p-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl md:text-4xl font-bold text-[var(--foreground)] flex flex-wrap items-center gap-2">
              <span>@{profile.username}&apos;s Profile</span>
              {profile.isSponsor && <SponsorBadge />}
              
              {/* 🎯 Render Server-Calculated Time Distribution Badges Safely on Public Profile View */}
              {profile.isNightOwl && (
                <span 
                  title="Night Owl Milestone Badge" 
                  className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-0.5 text-xs font-bold text-indigo-400"
                >
                  <Moon className="h-3 w-3" />
                  <span>Night Owl</span>
                </span>
              )}
              {profile.isEarlyBird && (
                <span 
                  title="Early Bird Milestone Badge" 
                  className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-xs font-bold text-amber-400"
                >
                  <Sun className="h-3 w-3" />
                  <span>Early Bird</span>
                </span>
              )}
            </h1>
            <CopyLinkButton url={profileUrl} />
          </div>
          <p className="mt-2 text-[var(--muted-foreground)]">
            GitHub activity and coding stats
          </p>
          {profile.publicGists > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <a
                href={gistsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--control)] px-3 py-1.5 text-sm font-medium text-[var(--card-foreground)] transition-colors hover:bg-[var(--control)]/80 hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50"
              >
                {profile.publicGists} Gists
              </a>
            </div>
          )}
          {compareHref && (
            <Link
              href={compareHref}
              className="primary-button mt-4 inline-flex rounded-lg px-4 py-2 text-sm font-semibold"
            >
              Compare with me
            </Link>
          )}
          {!loggedInUsername && (
            <Link
              href={signInToCompareHref}
              className="secondary-button mt-4 inline-flex rounded-lg px-4 py-2 text-sm font-semibold"
            >
              Log in to compare
            </Link>
          )}
        </div>
        <div className="flex items-center gap-3">
        {/* Download stats card button — client component */}
        <div className="flex flex-wrap items-center gap-3">
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
      </div>

      <div className="mb-8">
        <ShareProfileSection
          username={profile.username}
          streak={profile.streak.current}
          profileUrl={profileUrl}
        />
      </div>

      {/* Row 1: Contribution graph + Streak */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PublicContributionGraph data={profile.contributions} />
        </div>
        <div className="flex flex-col gap-6">
          <PublicStreakTracker streak={profile.streak} />
        </div>
      </div>

      {/* Custom Spotlight Repositories */}
      {profile.spotlightRepos?.length ? (
        <div className="mt-6">
          <PinnedReposWidget
            initialRepos={profile.spotlightRepos}
            isPublic={true}
          />
        </div>
      ) : null}

      {/* Row 2: Top repos */}
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
    </ProfileThemeWrapper>
  );
}

function PublicContributionGraph({
  data: contributionData,
}: {
  data: {
    days: number;
    total: number;
    data: Record<string, number>;
  };
}) {
  const data = Object.entries(contributionData.data ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, commits]) => ({ day, commits }));

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
        <div>
          <h2 className="text-lg font-semibold text-[var(--card-foreground)]">
            Commit Activity ({contributionData.days} days)
          </h2>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Total commits: {contributionData.total}
          </p>
        </div>
      </div>

      {data.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">
          No commit data available.
        </p>
      ) : (
        <div className="space-y-2">
          <div className="text-sm text-[var(--muted-foreground)]">
            {data.length} active days
          </div>
          <div className="grid grid-cols-7 gap-1">
            {data.map((day) => (
              <div
                key={day.day}
                className="aspect-square rounded-sm"
                style={{
                  backgroundColor:
                    day.commits > 0 ? "var(--accent)" : "var(--control)",
                  opacity:
                    day.commits > 0
                      ? Math.max(0.2, Math.min(day.commits / 10, 1))
                      : 1,
                }}
                title={`${day.day}: ${day.commits} commits`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PublicStreakTracker({ streak }: { streak: any }) {
  const stats = [
    {
      label: "Current Streak",
      value: streak.current,
      unit: "days",
      highlight: streak.current > 0,
      icon: "🔥",
    },
    {
      label: "Longest Streak",
      value: streak.longest,
      unit: "days",
      highlight: false,
      icon: "🏆",
    },
    {
      label: "Active Days (90d)",
      value: streak.totalActiveDays,
      unit: "days",
      highlight: false,
      icon: "📅",
    },
    {
      label: "Last Commit",
      value: streak.lastCommitDate
        ? new Date(streak.lastCommitDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })
        : "—",
      unit: "",
      highlight: false,
      icon: "⚡",
    },
  ];

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)]">
      <h2 className="mb-4 text-lg font-semibold text-[var(--card-foreground)]">
        Commit Streaks
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-lg border p-3 ${
              stat.highlight
                ? "border-[var(--accent)] bg-[var(--accent)]/10"
                : "border-[var(--border)] bg-[var(--control)]"
            }`}
          >
            <div className="text-xs font-medium text-[var(--muted-foreground)]">
              {stat.icon} {stat.label}
            </div>
            <div className="mt-1 text-lg font-bold text-[var(--card-foreground)]">
              {stat.value}
            </div>
            {stat.unit && (
              <div className="text-xs text-[var(--muted-foreground)]">
                {stat.unit}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PublicTopRepos({
  repos,
}: {
  repos: Array<{ name: string; commits: number; url: string }>;
}) {
  const maxCommits = repos[0]?.commits ?? 1;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)]">
      <h2 className="mb-4 text-lg font-semibold text-[var(--card-foreground)]">
        Top Repositories
      </h2>

      {repos.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">
          No repository data available.
        </p>
      ) : (
        <ul className="space-y-3">
          {repos.map((repo, idx) => {
            const barWidth = Math.max(
              Math.round((repo.commits / maxCommits) * 100),
              4
            );
            const shortName = repo.name.split("/")[1] ?? repo.name;
            return (
              <li key={repo.name}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <a
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="max-w-[70%] truncate text-[var(--card-foreground)] transition-colors hover:text-[var(--accent)]"
                    title={repo.name}
                  >
                    <span className="mr-1 text-[var(--muted-foreground)]">
                      #{idx + 1}
                    </span>
                    {shortName}
                  </a>
                  <span className="shrink-0 text-[var(--muted-foreground)]">
                    {repo.commits} commit{repo.commits !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--control)]">
                  <div
                    className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}