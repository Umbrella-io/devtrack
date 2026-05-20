import { Redis } from "@upstash/redis";
import type { NextRequest } from "next/server";

export const METRICS_CACHE_TTL_SECONDS = {
  contributions: 5 * 60,
  repos: 10 * 60,
  prs: 10 * 60,
  "pr-review-time": 10 * 60,
  streak: 2 * 60,
} as const;

type MetricsCacheEndpoint = keyof typeof METRICS_CACHE_TTL_SECONDS;
type CacheParamValue = boolean | number | string | null | undefined;

let redisClient: Redis | null | undefined;

function isTruthyCacheBypass(value: string | null): boolean {
  if (!value) {
    return false;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function getRedisClient(): Redis | null {
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
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([key, value]) => cacheParams.set(key, String(value)));

  return `metrics:${userId}:${endpoint}:${cacheParams.toString() || "default"}`;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();
  if (!redis) {
    return null;
  }

  try {
    return await redis.get<T>(key);
  } catch {
    return null;
  }
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  const redis = getRedisClient();
  if (!redis) {
    return;
  }

  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch {
    // Cache failures must not break dashboard metrics.
  }
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
    const cached = await cacheGet<T>(options.key);
    if (cached !== null) {
      return cached;
    }
  }

  const fresh = await loadFresh();
  await cacheSet(options.key, fresh, options.ttlSeconds);
  return fresh;
}
