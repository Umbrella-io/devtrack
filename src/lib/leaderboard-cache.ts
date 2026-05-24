export interface LeaderboardCacheEntry<T> {
  expiresAt: number;
  payload: T;
}

export interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export function pruneExpiredRateLimits(
  entries: Map<string, RateLimitEntry>,
  now: number = Date.now()
): void {
  for (const [key, entry] of entries.entries()) {
    if (entry.resetAt <= now) {
      entries.delete(key);
    }
  }
}

export function pruneExpiredLeaderboardCache<T>(
  cache: LeaderboardCacheEntry<T> | null,
  now: number = Date.now()
): LeaderboardCacheEntry<T> | null {
  if (!cache) {
    return null;
  }

  return cache.expiresAt <= now ? null : cache;
}
