export const WIDGET_KEYS = [
  "contributionGraph",
  "streakTracker",
  "prMetrics",
  "topRepos",
  "languageBreakdown",
  "goals",
  "ciAnalytics",
  "issuesTracker",
  "friendComparison",
] as const;

export type WidgetKey = (typeof WIDGET_KEYS)[number];

export type WidgetPrefs = Record<WidgetKey, boolean>;

export const DEFAULT_WIDGET_PREFS: WidgetPrefs = {
  contributionGraph: true,
  streakTracker: true,
  prMetrics: true,
  topRepos: true,
  languageBreakdown: true,
  goals: true,
  ciAnalytics: true,
  issuesTracker: true,
  friendComparison: true,
};

export const WIDGET_LABELS: Record<WidgetKey, string> = {
  contributionGraph: "Contribution Graph",
  streakTracker: "Streak Tracker",
  prMetrics: "PR Metrics",
  topRepos: "Top Repositories",
  languageBreakdown: "Language Breakdown",
  goals: "Goals",
  ciAnalytics: "CI Analytics",
  issuesTracker: "Issues Tracker",
  friendComparison: "Friend Comparison",
};

/**
 * Merge stored prefs with defaults so that:
 * - unknown/new widget keys default to visible (true)
 * - stored values override defaults
 * - malformed input (non-object) falls back to all-visible defaults
 */
export function mergeWidgetPrefs(stored: unknown): WidgetPrefs {
  const result = { ...DEFAULT_WIDGET_PREFS };

  if (!stored || typeof stored !== "object" || Array.isArray(stored)) {
    return result;
  }

  for (const key of WIDGET_KEYS) {
    const val = (stored as Record<string, unknown>)[key];
    if (typeof val === "boolean") {
      result[key] = val;
    }
  }

  return result;
}

/**
 * Validate that a partial prefs object only contains known keys with boolean values.
 * Returns an error string if invalid, otherwise null.
 */
export function validateWidgetPrefs(input: unknown): string | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return "user_widget_prefs must be an object";
  }

  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (!WIDGET_KEYS.includes(k as WidgetKey)) {
      return `Unknown widget key: ${k}`;
    }
    if (typeof v !== "boolean") {
      return `Widget preference for "${k}" must be a boolean`;
    }
  }

  return null;
}
