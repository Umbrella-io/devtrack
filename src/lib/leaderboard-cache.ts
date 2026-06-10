export type LeaderboardCacheEntry<T> = {
  expiresAt: number;
  payload: T;
};

export type RateLimitEntry = {
  count: number;
  resetAt: number;
};

/**
 * Prunes a leaderboard cache entry if it is expired.
 * @template T - The type of the cached leaderboard payload.
 * @param entry - The cache entry to check.
 * @param now - The current timestamp in milliseconds. Defaults to Date.now().
 * @returns The cache entry if still valid, or null if it is expired, null, or undefined.
 */
export function pruneExpiredLeaderboardCache<T>(
  entry: LeaderboardCacheEntry<T> | null | undefined,
  now: number = Date.now()
): LeaderboardCacheEntry<T> | null {
  if (!entry || !Number.isFinite(entry.expiresAt)) {
    return null;
  }
  return entry.expiresAt <= now ? null : entry;
}

/**
 * Prunes expired rate limit records from an in-memory bucket map.
 * @param buckets - The map containing rate limit entries keyed by bucket identifier.
 * @param now - The current timestamp in milliseconds. Defaults to Date.now().
 */
export function pruneExpiredRateLimits(
  buckets: Map<string, RateLimitEntry>,
  now: number = Date.now()
): void {
  for (const [key, record] of buckets) {
    if (!record || !Number.isFinite(record.resetAt) || record.resetAt <= now) {
      buckets.delete(key);
    }
  }
}
