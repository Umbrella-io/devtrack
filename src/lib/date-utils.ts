/**
 * Date utility helpers for formatting and date arithmetic.
 */

/**
 * Formats a date into a standard format: "MMM D, YYYY" (e.g. "May 15, 2026").
 * @throws {Error} If the date is invalid.
 */
export function formatDate(date: Date | string | number): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    throw new Error("Invalid date");
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

/**
 * Returns a relative time string (e.g. "Today", "Yesterday", "5 days ago") 
 * or the absolute formatted date if it is 30 or more days ago.
 * @throws {Error} If the date is invalid.
 */
export function formatRelativeDate(date: Date | string | number): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    throw new Error("Invalid date");
  }
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - d.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 30) return `${diffDays} days ago`;
  
  // Reuse our formatDate helper
  return formatDate(d);
}

/**
 * Calculates the number of calendar days between two dates.
 * Handles DST boundaries and timezone transitions correctly by using UTC calendar calculations.
 * @throws {Error} If either date is invalid.
 */
export function daysBetween(a: Date | string | number, b: Date | string | number): number {
  const dateA = new Date(a);
  const dateB = new Date(b);
  if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
    throw new Error("Invalid date");
  }
  
  // Calculate difference using pure UTC midnights to avoid DST hour gaps
  const utcA = Date.UTC(dateA.getUTCFullYear(), dateA.getUTCMonth(), dateA.getUTCDate());
  const utcB = Date.UTC(dateB.getUTCFullYear(), dateB.getUTCMonth(), dateB.getUTCDate());
  
  const diffTime = utcB - utcA;
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Returns true if the given date is the current calendar day.
 */
export function isToday(date: Date | string | number): boolean {
  const d = new Date(date);
  if (isNaN(d.getTime())) return false;
  
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
         d.getMonth() === now.getMonth() &&
         d.getDate() === now.getDate();
}

/**
 * Returns true if the given date is the previous calendar day.
 */
export function isYesterday(date: Date | string | number): boolean {
  const d = new Date(date);
  if (isNaN(d.getTime())) return false;
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return d.getFullYear() === yesterday.getFullYear() &&
         d.getMonth() === yesterday.getMonth() &&
         d.getDate() === yesterday.getDate();
}
