"use client";

import { useEffect, useMemo, useState } from "react";

type ProfileStatsData = {
  memberSince: string;
  publicRepos: number;
  totalStars: number;
  totalForks: number;
  followers: number;
};

type StatCard = {
  label: string;
  value: string;
  icon: string;
};

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatMemberSince(dateString: string) {
  const date = new Date(dateString);

  return new Intl.DateTimeFormat("en", {
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function ProfileStats() {
  const [data, setData] = useState<ProfileStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/metrics/profile-stats")
      .then(async (r) => {
        const res = await r.json();

        if (!r.ok) {
          throw new Error(res.error || "Failed to load profile stats");
        }

        return res as ProfileStatsData;
      })
      .then((res) => setData(res))
      .catch((error) => {
        console.error(error);
        setData(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const stats: StatCard[] = useMemo(() => {
    if (!data) return [];

    return [
      {
        label: "Member Since",
        value: formatMemberSince(data.memberSince),
        icon: "📅",
      },
      {
        label: "Public Repos",
        value: formatCompactNumber(data.publicRepos),
        icon: "📦",
      },
      {
        label: "Total Stars",
        value: formatCompactNumber(data.totalStars),
        icon: "⭐",
      },
      {
        label: "Total Forks",
        value: formatCompactNumber(data.totalForks),
        icon: "🍴",
      },
      {
        label: "Followers",
        value: formatCompactNumber(data.followers),
        icon: "👥",
      },
    ];
  }, [data]);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-[var(--card-foreground)]">
          GitHub Profile Stats
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg border border-[var(--border)] bg-[var(--control)] p-4"
              >
                <div className="mb-3 h-4 w-20 rounded bg-[var(--card-muted)] animate-pulse" />
                <div className="h-6 w-16 rounded bg-[var(--card-muted)] animate-pulse" />
              </div>
            ))
          : stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg border border-[var(--border)] bg-[var(--control)] p-4"
              >
                <div className="mb-2 flex items-center gap-2 text-xs font-medium text-[var(--muted-foreground)]">
                  <span>{stat.icon}</span>
                  <span>{stat.label}</span>
                </div>

                <div className="text-lg font-semibold text-[var(--card-foreground)]">
                  {stat.value}
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}
