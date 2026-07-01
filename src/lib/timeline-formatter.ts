import type { ActivityItem } from "./activity-formatter";

export interface TimelineActivity {
  id: string;
  type: "commit" | "pr" | "issue" | "review" | "event";
  repository: string;
  title: string;
  url: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

/**
 * Transforms an ActivityItem from the existing backend schema to the TimelineActivity schema.
 */
export function transformActivityItemToTimeline(item: ActivityItem): TimelineActivity {
  let mappedType: "commit" | "pr" | "issue" | "review" | "event";

  switch (item.type) {
    case "push":
      mappedType = "commit";
      break;
    case "pull_request":
      mappedType = "pr";
      break;
    case "issue":
    case "discussion":
      mappedType = "issue";
      break;
    case "review":
      mappedType = "review";
      break;
    default:
      mappedType = "event";
      break;
  }

  return {
    id: item.id,
    type: mappedType,
    repository: item.repo,
    title: item.title,
    url: item.url,
    timestamp: item.createdAt,
    metadata: {
      subtitle: item.subtitle,
      originalType: item.type,
    },
  };
}

export interface DateRangeState {
  preset: "7" | "30" | "90" | "custom";
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
}

/**
 * Filters activities based on type filter and date range conditions.
 */
export function filterActivities(
  activities: TimelineActivity[],
  filterType: "all" | "commit" | "pr" | "issue" | "review" | "event",
  dateRange: DateRangeState
): TimelineActivity[] {
  let filtered = activities;

  // 1. Filter by activity type
  if (filterType !== "all") {
    filtered = filtered.filter((act) => act.type === filterType);
  }

  // 2. Filter by date range
  const now = new Date();
  let startMs = 0;
  let endMs = Infinity;

  if (dateRange.preset === "7") {
    const d = new Date();
    d.setDate(now.getDate() - 7);
    startMs = d.getTime();
  } else if (dateRange.preset === "30") {
    const d = new Date();
    d.setDate(now.getDate() - 30);
    startMs = d.getTime();
  } else if (dateRange.preset === "90") {
    const d = new Date();
    d.setDate(now.getDate() - 90);
    startMs = d.getTime();
  } else if (dateRange.preset === "custom") {
    if (dateRange.startDate) {
      // Set to start of the day
      const d = new Date(dateRange.startDate);
      d.setHours(0, 0, 0, 0);
      startMs = d.getTime();
    }
    if (dateRange.endDate) {
      // Set to end of the day
      const d = new Date(dateRange.endDate);
      d.setHours(23, 59, 59, 999);
      endMs = d.getTime();
    }
  }

  filtered = filtered.filter((act) => {
    const time = new Date(act.timestamp).getTime();
    return time >= startMs && time <= endMs;
  });

  return filtered;
}

/**
 * Helper to get week start date (Monday) or week label.
 */
function getWeekString(date: Date): string {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Group activities based on daily, weekly, or monthly intervals.
 * Activities are assumed to be sorted in reverse chronological order already.
 */
export function groupActivities(
  activities: TimelineActivity[],
  viewType: "daily" | "weekly" | "monthly"
): Record<string, TimelineActivity[]> {
  const groups: Record<string, TimelineActivity[]> = {};

  activities.forEach((act) => {
    const date = new Date(act.timestamp);
    if (isNaN(date.getTime())) return;

    let groupKey = "";

    if (viewType === "daily") {
      groupKey = date.toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } else if (viewType === "weekly") {
      groupKey = `Week of ${getWeekString(new Date(date))}`;
    } else if (viewType === "monthly") {
      groupKey = date.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      });
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(act);
  });

  return groups;
}
