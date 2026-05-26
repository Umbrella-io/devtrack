import { Redis } from "@upstash/redis";
import type { NextRequest } from "next/server";

export const METRICS_CACHE_TTL_SECONDS = {
  contributions: 5 * 60,
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
  "coding-activity-insights": 5 * 60,
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

export function isMetricsCacheBypassed(req: NextRequest): boolean {
  const bypassParam =
    req.nextUrl.searchParams.get("refresh") ??
    req.nextUrl.searchParams.get("bypassCache") ??
    req.nextUrl.searchParams.get("sync");
  const bypassHeader = req.headers.get("x-devtrack-cache-bypass");

  return isTruthyCacheBypass(bypassParam) || isTruthyCacheBypass(bypassHeader);
}

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
    } catch {
      return null;
    }
  }
  
  return null;
}

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
    } catch {
      // Cache failures must not break dashboard metrics.
    }
  }

  setMemoryCacheValue(key, value, ttlSeconds);
}

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
