import Image from "next/image";
import type { GitHubAchievement } from "@/lib/github-achievements";

interface GitHubAchievementsProps {
  achievements: GitHubAchievement[];
  loading?: boolean;
  error?: string | null;
}

export default function GitHubAchievements({
  achievements,
  loading = false,
  error = null,
}: GitHubAchievementsProps) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-[var(--card-foreground)]">
        GitHub Achievements
      </h2>

      {loading ? (
        <div
          role="status"
          aria-live="polite"
          aria-busy="true"
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
        >
          <span className="sr-only">Loading GitHub achievements</span>
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div
              key={item}
              aria-hidden="true"
              className="h-28 rounded-lg bg-[var(--card-muted)] animate-pulse"
            />
          ))}
        </div>
      ) : error && achievements.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">
          GitHub achievements could not be loaded right now.
        </p>
      ) : achievements.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">
          No public GitHub achievements available yet.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {achievements.map((achievement) => (
            <a
              key={achievement.slug}
              href={achievement.url}
              target="_blank"
              rel="noopener noreferrer"
              title={achievement.description}
              className="group rounded-lg border border-[var(--border)] bg-[var(--control)] p-3 text-center transition-colors hover:border-[var(--accent)]"
            >
              <Image
                src={achievement.imageUrl}
                alt={`${achievement.title} GitHub achievement badge`}
                width={56}
                height={56}
                className="mx-auto h-14 w-14 object-contain"
                loading="lazy"
              />
              <span className="mt-2 block text-xs font-medium text-[var(--card-foreground)]">
                {achievement.title}
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
