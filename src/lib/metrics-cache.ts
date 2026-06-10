import { Redis } from "@upstash/redis";
import type { NextRequest } from "next/server";

export const METRICS_CACHE_TTL_SECONDS = {
  contributions: 5 * 60,
  "productive-hours": 5 * 60,
  discussions: 10 * 60,
  repos: 10 * 60,
  "inactive-repos": 10 * 60,
  prs: 10 * 60,
  "pr-review-time": 10 * 60,
  insights: 10 * 60,
  streak: 2 * 60,
  streak_freeze: 2 * 60,
  activity: 5 * 60,
  issues: 10 * 60,
  languages: 21600,
  "coding-activity-insights": 30 * 60,
  compare: 30 * 60,
  "weekly-summary": 30 * 60,
  "commit-times": 30 * 60,
  "achievement-progress": 10 * 60,
} as const;

type MetricsCacheEndpoint = keyof typeof METRICS_CACHE_TTL_SECONDS;
type CacheParamValue = boolean | number | string | null | undefined;
type MemoryCacheEntry = { value: unknown; expiresAt: number };

let redisClient: Redis | null | undefined;
const MAX_MEMORY_CACHE_ENTRIES = 500;

/* ============================================================
   Persists across Next.js Fast Refresh in local development
   ============================================================ */
const globalForCache = globalThis as unknown as {
  metricsMemoryCache?: Map<string, MemoryCacheEntry>;
};

const memoryCache =
  globalForCache.metricsMemoryCache ?? new Map<string, MemoryCacheEntry>();

if (process.env.NODE_ENV !== "production") {
  globalForCache.metricsMemoryCache = memoryCache;
}

function ensureMemoryCacheCapacity(): void {
  while (memoryCache.size > MAX_MEMORY_CACHE_ENTRIES) {
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey === undefined) {
      break;
    }
    memoryCache.delete(oldestKey);
  }
}

function isValidTtl(ttlSeconds: number): boolean {
  return Number.isFinite(ttlSeconds) && ttlSeconds > 0;
}

function getMemoryCacheValue<T>(key: string): T | null {
  const hit = memoryCache.get(key);
  if (!hit) {
    return null;
  }

  if (hit.expiresAt <= Date.now()) {
    memoryCache.delete(key);
    return null;
  }

  memoryCache.delete(key);
  memoryCache.set(key, hit);
  return hit.value as T;
}

function setMemoryCacheValue<T>(
  key: string,
  value: T,
  ttlSeconds: number
): void {
  if (!isValidTtl(ttlSeconds)) {
    return;
  }

  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
  ensureMemoryCacheCapacity();
}

function isTruthyCacheBypass(value: string | null): boolean {
  if (!value) {
    return false;
  }
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

/**
 * Initializes and returns the Redis client instance if configured.
 * @returns The Redis client instance, or null if connection details are missing.
 */
export function getRedisClient(): Redis | null {
  if (redisClient !== undefined) {
    return redisClient;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    redisClient = null;
    return redisClient;
  }

  redisClient = new Redis({ url, token });
  return redisClient;
}

/**
 * Checks if a cache bypass is requested via query parameters (refresh, bypassCache, sync) or headers.
 * @param req - The incoming Next.js request.
 * @returns True if the cache should be bypassed, false otherwise.
 */
export function isMetricsCacheBypassed(req: NextRequest): boolean {
  const bypassParam =
    req.nextUrl.searchParams.get("refresh") ??
    req.nextUrl.searchParams.get("bypassCache") ??
    req.nextUrl.searchParams.get("sync");
  const bypassHeader = req.headers.get("x-devtrack-cache-bypass");

  return isTruthyCacheBypass(bypassParam) || isTruthyCacheBypass(bypassHeader);
}

/**
 * Generates a structured Redis/memory cache key for a given user, endpoint, and set of parameters.
 * @param userId - The unique identifier of the user.
 * @param endpoint - The metrics endpoint slug name.
 * @param params - Optional parameters to include in the cache key.
 * @returns The formatted cache key string.
 */
export function metricsCacheKey(
  userId: string,
  endpoint: MetricsCacheEndpoint,
  params: Record<string, CacheParamValue> = {}
): string {
  const cacheParams = new URLSearchParams();

  Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .forEach(([key, value]) => cacheParams.set(key, String(value)));

  return `metrics:${userId}:${endpoint}:${cacheParams.toString() || "default"}`;
}

/**
 * Retrieves a value from the memory cache or Redis cache.
 * If retrieved from Redis, it caches the value back to local memory if a TTL is provided.
 * @template T - The expected type of the cached data.
 * @param key - The unique cache key.
 * @param ttlSeconds - Optional time-to-live in seconds to apply when writing to memory.
 * @returns A promise resolving to the cached value of type T, or null if not found.
 */
export async function cacheGet<T>(
  key: string,
  ttlSeconds?: number
): Promise<T | null> {
  const memoryValue = getMemoryCacheValue<T>(key);
  if (memoryValue !== null) {
    return memoryValue;
  }

  const redis = getRedisClient();
  
  if (redis) {
    try {
      const redisValue = await redis.get<T>(key);
      if (redisValue !== null && ttlSeconds !== undefined) {
        setMemoryCacheValue(key, redisValue, ttlSeconds);
      }
      return redisValue;
    } catch (e) {
      return null;
    }
  }
  
  return null;
}

/**
 * Stores a value in both the Redis cache (if configured) and the in-process memory cache.
 * @template T - The type of the value to cache.
 * @param key - The unique cache key.
 * @param value - The value to store.
 * @param ttlSeconds - The time-to-live in seconds.
 * @returns A promise that resolves when the cache operations are complete.
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  if (!isValidTtl(ttlSeconds)) {
    return;
  }

  const redis = getRedisClient();
  
  if (redis) {
    try {
      await redis.set(key, value, { ex: ttlSeconds });
    } catch (e) {
      // Cache failures must not break dashboard metrics.
    }
  }

  setMemoryCacheValue(key, value, ttlSeconds);
}

/**
 * Wraps a data loader function with caching logic, pulling from cache or fetching fresh data and caching it.
 * @template T - The type of the loaded data.
 * @param options - Cache control options.
 * @param options.bypass - If true, bypasses cache lookup and fetches fresh data.
 * @param options.key - The cache key.
 * @param options.ttlSeconds - Time-to-live in seconds.
 * @param loadFresh - A function to load fresh data if it is not cached.
 * @returns A promise resolving to the requested data.
 */
export async function withMetricsCache<T>(
  options: {
    bypass: boolean;
    key: string;
    ttlSeconds: number;
  },
  loadFresh: () => Promise<T>
): Promise<T> {
  if (!options.bypass) {
    const cached = await cacheGet<T>(options.key, options.ttlSeconds);
    if (cached !== null) {
      return cached;
    }
  }

  const fresh = await loadFresh();
  await cacheSet(options.key, fresh, options.ttlSeconds);
  return fresh;
}

/**
 * Removes a single cache key from both the in-process memory store and Redis.
 * Used to evict a specific entry (e.g. the shared leaderboard key) without
 * scanning all keys the way invalidateUserMetricsCache does for per-user data.
 * @param key - The cache key to delete.
 * @returns A promise resolving when deletion is complete.
 */
export async function cacheDelete(key: string): Promise<void> {
  memoryCache.delete(key);

  const redis = getRedisClient();
  if (!redis) return;

  try {
    await redis.del(key);
  } catch {
    // Cache invalidation failures must not surface to callers.
  }
}

/**
 * Invalidates all cache entries for a specific user from both the memory cache and Redis.
 * @param userId - The unique identifier of the user.
 * @returns A promise resolving when invalidation is complete.
 */
export async function invalidateUserMetricsCache(userId: string): Promise<void> {
  const prefix = `metrics:${userId}:`;

  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }

  const redis = getRedisClient();
  if (!redis) return;

  try {
    let cursor = 0;
    do {
      const [nextCursor, keys] = await redis.scan(cursor, { match: `${prefix}*`, count: 100 });
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      cursor = Number(nextCursor);
    } while (cursor !== 0);
  } catch (e) {
    // Invalidation failures must not break the webhook response.
  }
}

/**
 * Invalidates all leaderboard-related cache entries from both the memory cache and Redis.
 * @returns A promise resolving when invalidation is complete.
 */
export async function invalidateLeaderboardCache(): Promise<void> {
  const prefix = `leaderboard:`;

  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }

  const redis = getRedisClient();
  if (!redis) return;

  try {
    let cursor = 0;
    do {
      const [nextCursor, keys] = await redis.scan(cursor, { match: `${prefix}*`, count: 100 });
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      cursor = Number(nextCursor);
    } while (cursor !== 0);
  } catch (e) {
    // Invalidation failures must not break the settings/webhook response.
  }
}
