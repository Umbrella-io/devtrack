/**
 * Leaderboard Cache
 *
 * TTL-based in-memory cache for leaderboard data.
 * Reduces GitHub API usage and prevents recomputation on every request.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class LeaderboardCache<T = unknown> {
  private cache = new Map<string, CacheEntry<T>>();
  private ttlMs: number;

  constructor(ttlMinutes: number = 15) {
    this.ttlMs = ttlMinutes * 60 * 1000;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(key: string, data: T): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidateAll(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

// Singleton instance — shared across requests in the same serverless instance
export const leaderboardCache = new LeaderboardCache(15); // 15 min TTL

/**
 * Cached leaderboard fetch wrapper.
 *
 * @param cacheKey - Unique key for this leaderboard query
 * @param fetcher - Async function that computes the leaderboard
 * @returns Cached or freshly computed leaderboard data
 */
export async function getCachedLeaderboard<T>(
  cacheKey: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = leaderboardCache.get(cacheKey) as T | null;
  if (cached !== null) {
    return cached;
  }

  const fresh = await fetcher();
  leaderboardCache.set(cacheKey, fresh as unknown);
  return fresh;
}
