export const STREAK_LOOKBACK_DAYS = 365;

export function getStreakLookbackStart(referenceDate = new Date()): Date {
  const since = new Date(referenceDate);
  since.setDate(since.getDate() - STREAK_LOOKBACK_DAYS);
  return since;
}
