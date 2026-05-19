import { Metadata } from "next";
import BadgeSection from "@/components/BadgeSection";
import ContributionGraph from "@/components/ContributionGraph";
import StreakTracker from "@/components/StreakTracker";
import TopRepos from "@/components/TopRepos";
import StatsCard from "@/components/StatsCard";
import CopyLinkButton from "@/components/CopyLinkButton";

interface PublicProfileData {
  username: string;
  userId: string;
  repos: Array<{ name: string; commits: number; url: string }>;
  contributions: {
    days: number;
    total: number;
    data: Record<string, number>;
  };
  streak: {
    current: number;
    longest: number;
    lastCommitDate: string | null;
    totalActiveDays: number;
  };
}

async function fetchPublicProfile(
  username: string
): Promise<PublicProfileData | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";

  try {
    const res = await fetch(`${baseUrl}/api/public/${username}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      return null;
    }

    return res.json();
  } catch (error) {
    console.error(`Error fetching public profile for ${username}:`, error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { username: string };
}): Promise<Metadata> {
  const { username } = params;
  const profile = await fetchPublicProfile(username);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
  const profileUrl = `${baseUrl}/u/${username}`;

  if (!profile) {
    return {
      title: "Profile Not Found",
      description: "This profile is not available or is private.",
    };
  }

  return {
    title: `${username}'s DevTrack Profile`,
    description: `GitHub stats and coding activity for ${username}. View commits, streaks, and top repositories.`,
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

export default async function PublicProfilePage({
  params,
}: {
  params: { username: string };
}) {
  const { username } = params;
  const profile = await fetchPublicProfile(username);

  if (!profile) {
    return (
      <div className="min-h-screen bg-[var(--background)] p-4 md:p-8 text-[var(--foreground)] transition-colors flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Profile Not Found
          </h1>
          <p className="text-[var(--muted-foreground)] mb-6">
            This profile is not available or is private.
          </p>
          <a
            href="/"
            className="inline-block px-6 py-2 bg-[var(--accent)] text-[var(--accent-foreground)] rounded-lg hover:opacity-90 transition-opacity"
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
    <div className="min-h-screen bg-[var(--background)] p-4 md:p-8 text-[var(--foreground)] transition-colors">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl md:text-4xl font-bold text-[var(--foreground)]">
              @{profile.username}&apos;s Profile
            </h1>
            <CopyLinkButton />
          </div>
          <p className="mt-2 text-[var(--muted-foreground)]">
            GitHub activity and coding stats
          </p>
        </div>
        {/* Download stats card button — client component */}
        <StatsCard
          username={profile.username}
          avatarUrl={avatarUrl}
          currentStreak={profile.streak.current}
          longestStreak={profile.streak.longest}
          totalCommits={profile.contributions.total}
          topRepo={topRepo}
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

      {/* Row 2: Top repos */}
      <div className="mt-6">
        <PublicTopRepos repos={profile.repos} />
      </div>

      {/* Row 3: Get your badge */}
      <div className="mt-6">
        <BadgeSection username={profile.username} />
      </div>
    </div>
  );
}

/**
 * Public variant of ContributionGraph component.
 * Displays data passed as props instead of fetching it.
 */
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
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
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
          {/* Simple text-based activity display for public profiles */}
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
                    day.commits > 0
                      ? `hsl(var(--accent) / ${Math.min(day.commits / 10, 1)})`
                      : "var(--control)",
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

/**
 * Public variant of StreakTracker component.
 * Displays data passed as props.
 */
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
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
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

/**
 * Public variant of TopRepos component.
 * Displays data passed as props.
 */
function PublicTopRepos({
  repos,
}: {
  repos: Array<{ name: string; commits: number; url: string }>;
}) {
  const maxCommits = repos[0]?.commits ?? 1;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
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
