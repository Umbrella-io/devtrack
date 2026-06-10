import { Redis } from "@upstash/redis";

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

/**
 * Retrieves cached data from Upstash Redis by key.
 * @template T - The expected type of the cached data.
 * @param key - The unique cache key.
 * @returns A promise resolving to the cached value of type T, or null if key does not exist or Redis is not configured.
 */
export async function getCachedData<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    return await redis.get<T>(key);
  } catch (e) {
    console.error("Cache read error:", e);
    return null;
  }
}

/**
 * Sets cached data in Upstash Redis with a specific key and time-to-live.
 * @template T - The type of the value to cache.
 * @param key - The unique cache key.
 * @param value - The value to store in the cache.
 * @param ttlSeconds - Time-to-live in seconds. Defaults to 300.
 * @returns A promise resolving when the cache operation is complete.
 */
export async function setCachedData<T>(key: string, value: T, ttlSeconds = 300): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (e) {
    console.error("Cache write error:", e);
  }
}
