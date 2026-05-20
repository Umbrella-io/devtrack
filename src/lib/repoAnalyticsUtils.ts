import { formatDistanceToNow, format } from "date-fns";
import { RepoHealth } from "./repoAnalytics";

export function formatRelativeDate(iso: string) {
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
}

export function formatDisplayDate(iso: string) {
  return format(new Date(iso), "MMM d, yyyy");
}

export function formatDate(iso: string) {
  return formatDisplayDate(iso);
}

export function percentageFromMap(values: Record<string, number>) {
  const safeEntries = Object.entries(values).filter(
    ([, value]) => typeof value === "number" && Number.isFinite(value)
  ) as Array<[string, number]>;
  const total = safeEntries.reduce((acc, [, value]) => acc + value, 0);
  if (!total) return [];
  return safeEntries
    .map(([name, bytes]) => ({
      name,
      bytes,
      percentage: Number(((bytes / total) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.bytes - a.bytes);
}

export function calculateRepoHealth(metrics: {
  commitsLast30Days: number;
  commitDaysActive: number;
  openIssues: number;
  prsOpened: number;
  prsClosed: number;
}): RepoHealth {
  const TOTAL_DAYS = 7;

  const consistency = Math.min(
    100,
    Math.round((metrics.commitDaysActive / TOTAL_DAYS) * 100)
  );

  const mergeEfficiency =
    metrics.prsOpened === 0
      ? 100
      : Math.min(
          100,
          Math.round((metrics.prsClosed / metrics.prsOpened) * 100)
        );

  const maintenancePressure = Math.max(
    0,
    100 - metrics.openIssues * 3
  );

  const activityScore = Math.min(
    100,
    metrics.commitsLast30Days * 4
  );

  const maintenanceScore = Math.round(
    (
      consistency +
      mergeEfficiency +
      maintenancePressure +
      activityScore
    ) / 4
  );

  let activityLevel: RepoHealth["activityLevel"] = "Low";

  if (metrics.commitsLast30Days >= 25)
    activityLevel = "High";
  else if (metrics.commitsLast30Days >= 8)
    activityLevel = "Medium";

  return {
    activityLevel,
    consistency,
    mergeEfficiency,
    maintenanceScore,
  };
}

export const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  CSS: "#563d7c",
  HTML: "#e34c26",
  Go: "#00ADD8",
  Rust: "#dea584",
};

export const COLOR_MAP = LANGUAGE_COLORS;

export function colorFor(name: string) {
  return LANGUAGE_COLORS[name] ?? "#94a3b8";
}
