import { startOfWeek } from "date-fns/startOfWeek";
import { subWeeks } from "date-fns/subWeeks";

/**
 * Converts a Date object to a pseudo-UTC Date object where the UTC time fields
 * match the local time fields (wall clock time).
 * 
 * @param date - The input Date object.
 * @returns A new Date object offset by the timezone difference.
 */
function toUtcWallClock(date: Date): Date {
  return new Date(date.getTime() + date.getTimezoneOffset() * 60_000);
}

/**
 * Reverses the transformation done by toUtcWallClock, converting a pseudo-UTC
 * wall clock date back to its original local time alignment.
 * 
 * @param date - The pseudo-UTC wall clock Date object.
 * @returns A new Date object with timezone offset subtracted.
 */
function fromUtcWallClock(date: Date): Date {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
}

/**
 * Calculates the start of the week (Monday) in UTC for the given date.
 * Adjusts for timezone differences to ensure consistent weekly grouping.
 * 
 * @param date - The reference Date object.
 * @returns A new Date representing Monday 00:00:00.000 UTC of that week.
 */
function getUtcWeekStart(date: Date): Date {
  const utcWallClock = toUtcWallClock(date);
  const weekStart = startOfWeek(utcWallClock, { weekStartsOn: 1 });
  const utcWeekStart = fromUtcWallClock(weekStart);
  utcWeekStart.setUTCHours(0, 0, 0, 0);
  return utcWeekStart;
}

/**
 * Formats a Date object as an ISO 8601 calendar date string (YYYY-MM-DD).
 * Use this to get local date representations without timezone/hour shifting.
 * 
 * @param d - The Date object to format.
 * @returns The formatted date string (e.g., "2026-06-07").
 */
export function toDateStr(d: Date): string {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Calculates the fractional number of calendar days between two date strings.
 * 
 * @param a - The starting date string (parsable by Date constructor).
 * @param b - The ending date string (parsable by Date constructor).
 * @returns The difference in days (b - a). Can be negative or fractional.
 */
export function dateDiffDays(a: string, b: string): number {
  return (new Date(b).getTime() - new Date(a).getTime()) / 86400000;
}

/**
 * Alias for dateDiffDays.
 * @see dateDiffDays
 */
export const dateDiff = dateDiffDays;

/**
 * Computes the start and end timestamps representing the current week range.
 * The week starts on Monday at 00:00:00 UTC and ends at the current moment
 * (with the end hour/minute set to 23:59:59 UTC).
 * 
 * @returns An object containing the start and end ISO-8601 string timestamps.
 */
export function getThisWeekRange(): { start: string; end: string } {
  const now = new Date();
  const weekStart = getUtcWeekStart(now);
  const end = new Date(now);
  end.setUTCHours(23, 59, 59, 0);

  return {
    start: weekStart.toISOString(),
    end: end.toISOString(),
  };
}

/**
 * Computes the start and end timestamps representing the previous week range.
 * The week starts on Monday at 00:00:00 UTC and ends on Sunday at 23:59:59 UTC.
 * 
 * @returns An object containing the start and end ISO-8601 string timestamps.
 */
export function getLastWeekRange(): { start: string; end: string } {
  const thisWeekStart = getUtcWeekStart(new Date());
  const lastWeekStart = subWeeks(thisWeekStart, 1);
  lastWeekStart.setUTCHours(0, 0, 0, 0);
  const lastWeekEnd = new Date(thisWeekStart);
  lastWeekEnd.setUTCDate(lastWeekEnd.getUTCDate() - 1);
  lastWeekEnd.setUTCHours(23, 59, 59, 0);

  return {
    start: lastWeekStart.toISOString(),
    end: lastWeekEnd.toISOString(),
  };
}