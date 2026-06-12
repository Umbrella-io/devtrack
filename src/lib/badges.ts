export interface BadgeDefinition {
  id: string;
  name: string;
  emoji: string;
  description: string;
  unlockCondition: string;
}

export const BADGE_DEFINITIONS: readonly BadgeDefinition[] = [
  {
    id: "week_warrior",
    name: "Week Warrior",
    emoji: "🔥",
    description: "Maintained a streak for 7 consecutive days",
    unlockCondition: "Maintain a 7-day streak",
  },
  {
    id: "month_master",
    name: "Month Master",
    emoji: "🏔️",
    description: "Maintained a streak for 30 consecutive days",
    unlockCondition: "Maintain a 30-day streak",
  },
  {
    id: "century",
    name: "Century",
    emoji: "💯",
    description: "Made 100 total commits",
    unlockCondition: "Reach 100 total commits",
  },
  {
    id: "night_owl",
    name: "Night Owl",
    emoji: "🌙",
    description: "Made 5 or more commits between midnight and 4am",
    unlockCondition: "Make 5+ commits between 00:00–04:00",
  },
  {
    id: "early_bird",
    name: "Early Bird",
    emoji: "🌅",
    description: "Made 5 or more commits before 7am",
    unlockCondition: "Make 5+ commits before 07:00",
  },
  {
    id: "pr_machine",
    name: "PR Machine",
    emoji: "🔀",
    description: "Merged 10 or more pull requests",
    unlockCondition: "Merge 10+ pull requests",
  },
  {
    id: "star_collector",
    name: "Star Collector",
    emoji: "⭐",
    description: "Earned 50 or more GitHub stars across repositories",
    unlockCondition: "Collect 50+ GitHub stars across your repositories",
  },
  {
    id: "ice_saver",
    name: "Ice Saver",
    emoji: "🧊",
    description: "Used a streak freeze for the first time",
    unlockCondition: "Use a streak freeze",
  },
] as const;

export interface BadgeStats {
  streak: number;
  totalCommits: number;
  nightCommits: number;
  earlyCommits: number;
  mergedPRs: number;
  totalStars: number;
  hasUsedFreeze: boolean;
}

export function computeEarnedBadgeKeys(stats: BadgeStats): string[] {
  const earned: string[] = [];
  if (stats.streak >= 7) earned.push("week_warrior");
  if (stats.streak >= 30) earned.push("month_master");
  if (stats.totalCommits >= 100) earned.push("century");
  if (stats.nightCommits >= 5) earned.push("night_owl");
  if (stats.earlyCommits >= 5) earned.push("early_bird");
  if (stats.mergedPRs >= 10) earned.push("pr_machine");
  if (stats.totalStars >= 50) earned.push("star_collector");
  if (stats.hasUsedFreeze) earned.push("ice_saver");
  return earned;
}

export function computeBadgeProgress(
  stats: BadgeStats,
): Record<string, { current: number; total: number }> {
  return {
    week_warrior: { current: Math.min(stats.streak, 7), total: 7 },
    month_master: { current: Math.min(stats.streak, 30), total: 30 },
    century: { current: Math.min(stats.totalCommits, 100), total: 100 },
    night_owl: { current: Math.min(stats.nightCommits, 5), total: 5 },
    early_bird: { current: Math.min(stats.earlyCommits, 5), total: 5 },
    pr_machine: { current: Math.min(stats.mergedPRs, 10), total: 10 },
    star_collector: { current: Math.min(stats.totalStars, 50), total: 50 },
  };
}
