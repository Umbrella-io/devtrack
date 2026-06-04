/**
 * Timezone-Aware Streak Date Utilities
 *
 * Prevents streak miscalculation for users in non-UTC timezones.
 * All streak comparisons use the user's local date, not UTC.
 */

/**
 * Get the current local date string (YYYY-MM-DD) for a given timezone.
 *
 * @param timezone - IANA timezone string (e.g., "America/New_York")
 * @returns Date string in YYYY-MM-DD format
 */
export function getLocalDateString(timezone: string = "UTC"): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    // Fallback to UTC if timezone is invalid
    return new Date().toISOString().slice(0, 10);
  }
}

/**
 * Convert a UTC timestamp to a local date string for a given timezone.
 */
export function utcToLocalDate(utcTimestamp: string | Date, timezone: string = "UTC"): string {
  const date = typeof utcTimestamp === "string" ? new Date(utcTimestamp) : utcTimestamp;
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/**
 * Check if two dates are consecutive days in a given timezone.
 */
export function areConsecutiveDays(
  date1: string,
  date2: string,
  timezone: string = "UTC"
): boolean {
  const d1 = new Date(date1 + "T12:00:00Z");
  const d2 = new Date(date2 + "T12:00:00Z");
  const diffMs = Math.abs(d2.getTime() - d1.getTime());
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return diffDays === 1;
}

/**
 * Calculate streak from a sorted list of contribution dates.
 *
 * @param dates - Array of date strings (YYYY-MM-DD), most recent first
 * @param userTimezone - User's IANA timezone string
 * @returns Current streak length in days
 */
export function calculateStreak(dates: string[], userTimezone: string = "UTC"): number {
  if (!dates || dates.length === 0) return 0;

  const today = getLocalDateString(userTimezone);
  const yesterday = getLocalDateString(userTimezone);

  const uniqueDates = [...new Set(dates)].sort().reverse();

  // Streak must start from today or yesterday
  if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) {
    return 0;
  }

  let streak = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    if (areConsecutiveDays(uniqueDates[i], uniqueDates[i - 1], userTimezone)) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
