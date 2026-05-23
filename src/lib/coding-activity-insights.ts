export interface CodingActivityHourlyCount {
  hour: number;
  count: number;
}

export interface CodingActivityInsightDayCount {
  day: string;
  count: number;
}

export interface CodingActivityInsight {
  timezone: string;
  hourlyCounts: CodingActivityHourlyCount[];
  mostActiveHour: {
    hour: number;
    count: number;
    label: string;
  };
  leastActiveHour: {
    hour: number;
    count: number;
    label: string;
  };
  mostActiveDay?: {
    day: string;
    count: number;
  };
  totalActivities: number;
  dayCounts?: CodingActivityInsightDayCount[];
}

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function formatClockHour(hour: number): string {
  const normalizedHour = ((hour % 24) + 24) % 24;
  const period = normalizedHour < 12 ? "AM" : "PM";
  const displayHour = normalizedHour % 12 === 0 ? 12 : normalizedHour % 12;
  return `${displayHour} ${period}`;
}

export function formatHourRange(hour: number): string {
  return `${formatClockHour(hour)} – ${formatClockHour(hour + 1)}`;
}

function getHourInTimeZone(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const hourPart = parts.find((part) => part.type === "hour")?.value ?? "0";
  const parsedHour = Number(hourPart);
  return Number.isFinite(parsedHour) ? parsedHour : 0;
}

function getDayNameInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
  }).formatToParts(date);

  const dayPart = parts.find((part) => part.type === "weekday")?.value ?? "Sunday";
  return DAY_NAMES.includes(dayPart) ? dayPart : "Sunday";
}

function normalizeOffsetLabel(value: string): string {
  const normalized = value.replace(/^GMT/, "UTC");
  return /^UTC[+-]/.test(normalized) ? normalized.replace(/^UTC/, "UTC ") : normalized;
}

export function formatTimeZoneLabel(timeZone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "shortOffset",
    });
    const offset = formatter
      .formatToParts(new Date())
      .find((part) => part.type === "timeZoneName")?.value;

    if (offset) {
      return normalizeOffsetLabel(offset);
    }
  } catch {
    // Fallback to the raw zone name below.
  }

  return timeZone;
}

function pickHighestCount<T extends { count: number }>(items: T[]): T | null {
  if (items.length === 0) {
    return null;
  }

  return items.reduce((best, current) => {
    if (current.count > best.count) {
      return current;
    }

    return best;
  }, items[0]);
}

function pickLowestNonZeroCount<T extends { count: number }>(items: T[]): T | null {
  const nonZeroItems = items.filter((item) => item.count > 0);

  if (nonZeroItems.length === 0) {
    return null;
  }

  return nonZeroItems.reduce((best, current) => {
    if (current.count < best.count) {
      return current;
    }

    return best;
  }, nonZeroItems[0]);
}

export function summarizeCodingActivity(
  timestamps: string[],
  timeZone: string
): CodingActivityInsight {
  const hourlyCounts = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: 0,
  }));
  const dayCounts = DAY_NAMES.map((day) => ({ day, count: 0 }));

  let totalActivities = 0;

  for (const timestamp of timestamps) {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      continue;
    }

    totalActivities += 1;
    const hour = getHourInTimeZone(date, timeZone);
    hourlyCounts[hour].count += 1;

    const dayName = getDayNameInTimeZone(date, timeZone);
    const dayIndex = DAY_NAMES.indexOf(dayName);
    if (dayIndex >= 0) {
      dayCounts[dayIndex].count += 1;
    }
  }

  const mostActiveHour = pickHighestCount(hourlyCounts) ?? hourlyCounts[0];
  const leastActiveHour = pickLowestNonZeroCount(hourlyCounts) ?? hourlyCounts[0];
  const mostActiveDay = pickHighestCount(dayCounts);

  return {
    timezone: formatTimeZoneLabel(timeZone),
    hourlyCounts,
    mostActiveHour: {
      hour: mostActiveHour.hour,
      count: mostActiveHour.count,
      label: formatHourRange(mostActiveHour.hour),
    },
    leastActiveHour: {
      hour: leastActiveHour.hour,
      count: leastActiveHour.count,
      label: formatHourRange(leastActiveHour.hour),
    },
    mostActiveDay:
      mostActiveDay && mostActiveDay.count > 0
        ? { day: mostActiveDay.day, count: mostActiveDay.count }
        : undefined,
    totalActivities,
    dayCounts: dayCounts.some((item) => item.count > 0) ? dayCounts : undefined,
  };
}
