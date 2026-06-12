"use client";

import { useEffect, useState } from "react";
import { BADGE_DEFINITIONS } from "@/lib/badges";

export interface BadgeItem {
  id: string;
  name: string;
  emoji: string;
  description: string;
  earned: boolean;
  earnedAt: string | null;
  progress: { current: number; total: number } | null;
  unlockCondition: string;
}

interface BadgesResponse {
  earned: BadgeItem[];
  locked: BadgeItem[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function BadgeCard({ badge }: { badge: BadgeItem }) {
  const tooltip = badge.earned && badge.earnedAt
    ? `Earned on ${formatDate(badge.earnedAt)}`
    : `Unlock by: ${badge.unlockCondition}`;

  return (
    <div
      className={`group relative rounded-xl border p-4 text-center transition-all duration-200 ${
        badge.earned
          ? "border-[var(--accent)] bg-[var(--accent)]/5 shadow-sm hover:shadow-md hover:-translate-y-0.5"
          : "border-[var(--border)] bg-[var(--control)] opacity-50"
      }`}
      aria-label={`${badge.name}: ${tooltip}`}
      title={tooltip}
    >
      <div className="text-3xl mb-2 leading-none" aria-hidden="true">
        {badge.emoji}
      </div>
      <div className="text-xs font-semibold text-[var(--card-foreground)] leading-tight">
        {badge.name}
      </div>

      {badge.earned && badge.earnedAt && (
        <div className="mt-1 text-[10px] text-[var(--muted-foreground)]">
          {formatDate(badge.earnedAt)}
        </div>
      )}

      {!badge.earned && badge.progress && (
        <div className="mt-2">
          <div className="h-1 w-full rounded-full bg-[var(--border)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
              style={{
                width: `${Math.min((badge.progress.current / badge.progress.total) * 100, 100)}%`,
              }}
            />
          </div>
          <div className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">
            {badge.progress.current} / {badge.progress.total}
          </div>
        </div>
      )}

      <div
        role="tooltip"
        className="pointer-events-none absolute -top-10 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[var(--foreground)] px-2 py-1 text-[10px] text-[var(--background)] opacity-0 shadow-md transition-opacity group-hover:opacity-100"
      >
        {tooltip}
      </div>
    </div>
  );
}

export default function AchievementBadges() {
  const [data, setData] = useState<BadgesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/badges")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load badges");
        return r.json() as Promise<BadgesResponse>;
      })
      .then(setData)
      .catch(() => setError("Could not load badges"))
      .finally(() => setLoading(false));
  }, []);

  const allBadges = data ? [...data.earned, ...data.locked] : [];

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm transition-all duration-300 hover:shadow-md">
      <h2 className="mb-1 text-lg font-semibold text-[var(--card-foreground)]">
        Achievements
      </h2>
      <p className="mb-4 text-sm text-[var(--muted-foreground)]">
        Earn badges by reaching milestones in your dev journey
      </p>

      {loading ? (
        <div
          role="status"
          aria-live="polite"
          aria-busy="true"
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"
        >
          <span className="sr-only">Loading badges…</span>
          {BADGE_DEFINITIONS.map((def) => (
            <div
              key={def.id}
              aria-hidden="true"
              className="h-24 rounded-xl skeleton-shimmer"
            />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-[var(--muted-foreground)]">{error}</p>
      ) : allBadges.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">
          No badges yet — keep coding to earn your first!
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {allBadges.map((badge) => (
            <BadgeCard key={badge.id} badge={badge} />
          ))}
        </div>
      )}
    </div>
  );
}
