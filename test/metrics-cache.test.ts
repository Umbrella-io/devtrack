import { describe, it, expect, vi, beforeEach } from 'vitest';

declare global {
  // eslint-disable-next-line no-var
  var metricsMemoryCache: Map<string, { value: unknown; expiresAt: number }> | undefined;
}

const mockRedisGet = vi.fn();
const mockRedisSet = vi.fn();

vi.mock('@upstash/redis', () => {
  const MockRedis = vi.fn(function () {
    return { get: mockRedisGet, set: mockRedisSet };
  });
  return { Redis: MockRedis };
});

function setRedisEnv(): void {
  process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
}

function clearRedisEnv(): void {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
}

function seedMemoryCache(
  entries: Record<string, { value: unknown; expiresAt: number }>
): void {
  globalThis.metricsMemoryCache = new Map(Object.entries(entries));
}

describe('metricsCacheKey', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete globalThis.metricsMemoryCache;
    clearRedisEnv();
  });

  it('filters null param values from key', async () => {
    const { metricsCacheKey } = await import('../src/lib/metrics-cache');
    const key = metricsCacheKey('user1', 'prs', { repo: null, type: 'open' });
    expect(key).toBe('metrics:user1:prs:type=open');
  });

  it('filters undefined param values from key', async () => {
    const { metricsCacheKey } = await import('../src/lib/metrics-cache');
    const key = metricsCacheKey('user1', 'prs', { repo: undefined, type: 'open' });
    expect(key).toBe('metrics:user1:prs:type=open');
  });

  it('includes numeric zero as "0" in key', async () => {
    const { metricsCacheKey } = await import('../src/lib/metrics-cache');
    const key = metricsCacheKey('user1', 'prs', { page: 0 });
    expect(key).toBe('metrics:user1:prs:page=0');
  });

  it('includes empty string in key', async () => {
    const { metricsCacheKey } = await import('../src/lib/metrics-cache');
    const key = metricsCacheKey('user1', 'prs', { search: '' });
    expect(key).toBe('metrics:user1:prs:search=');
  });

  it('serializes boolean true as "true" in key', async () => {
    const { metricsCacheKey } = await import('../src/lib/metrics-cache');
    const key = metricsCacheKey('user1', 'prs', { active: true });
    expect(key).toBe('metrics:user1:prs:active=true');
  });

  it('serializes boolean false as "false" in key', async () => {
    const { metricsCacheKey } = await import('../src/lib/metrics-cache');
    const key = metricsCacheKey('user1', 'prs', { active: false });
    expect(key).toBe('metrics:user1:prs:active=false');
  });
});

describe('cacheSet TTL validation', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete globalThis.metricsMemoryCache;
    setRedisEnv();
  });

  it('rejects NaN TTL — does not call Redis.set', async () => {
    const { cacheSet } = await import('../src/lib/metrics-cache');
    await cacheSet('key', 'val', NaN);
    expect(mockRedisSet).not.toHaveBeenCalled();
  });

  it('rejects zero TTL — does not call Redis.set', async () => {
    const { cacheSet } = await import('../src/lib/metrics-cache');
    await cacheSet('key', 'val', 0);
    expect(mockRedisSet).not.toHaveBeenCalled();
  });

  it('rejects negative TTL — does not call Redis.set', async () => {
    const { cacheSet } = await import('../src/lib/metrics-cache');
    await cacheSet('key', 'val', -1);
    expect(mockRedisSet).not.toHaveBeenCalled();
  });

  it('rejects Infinity TTL — does not call Redis.set', async () => {
    const { cacheSet } = await import('../src/lib/metrics-cache');
    await cacheSet('key', 'val', Infinity);
    expect(mockRedisSet).not.toHaveBeenCalled();
  });

  it('accepts positive finite TTL — calls Redis.set with correct params', async () => {
    mockRedisSet.mockResolvedValueOnce(undefined);
    const { cacheSet } = await import('../src/lib/metrics-cache');
    await cacheSet('key', 'val', 300);
    expect(mockRedisSet).toHaveBeenCalledWith('key', 'val', { ex: 300 });
  });
});

describe('cacheGet', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete globalThis.metricsMemoryCache;
  });

  it('returns memory value when present and not expired', async () => {
    clearRedisEnv();
    const future = Date.now() + 60000;
    seedMemoryCache({ 'mem-key': { value: 'stored', expiresAt: future } });
    const { cacheGet } = await import('../src/lib/metrics-cache');
    const result = await cacheGet('mem-key');
    expect(result).toBe('stored');
  });

  it('returns null when memory is empty and Redis is unavailable', async () => {
    clearRedisEnv();
    const { cacheGet } = await import('../src/lib/metrics-cache');
    const result = await cacheGet('nonexistent');
    expect(result).toBeNull();
  });

  it('returns expired memory entry as null and removes it', async () => {
    clearRedisEnv();
    const past = Date.now() - 60000;
    seedMemoryCache({ 'stale-key': { value: 'old', expiresAt: past } });
    const { cacheGet } = await import('../src/lib/metrics-cache');
    const result = await cacheGet('stale-key');
    expect(result).toBeNull();
    const cached = globalThis.metricsMemoryCache!;
    expect(cached.has('stale-key')).toBe(false);
  });

  it('returns value from Redis when available', async () => {
    setRedisEnv();
    mockRedisGet.mockResolvedValueOnce('redis-val');
    const { cacheGet } = await import('../src/lib/metrics-cache');
    const result = await cacheGet('redis-key');
    expect(result).toBe('redis-val');
    expect(mockRedisGet).toHaveBeenCalledWith('redis-key');
  });

  it('returns null when Redis throws', async () => {
    setRedisEnv();
    mockRedisGet.mockRejectedValueOnce(new Error('Redis down'));
    const { cacheGet } = await import('../src/lib/metrics-cache');
    const result = await cacheGet('failing-key');
    expect(result).toBeNull();
  });

  it('refills memory cache from Redis when ttlSeconds is provided', async () => {
    setRedisEnv();
    mockRedisGet.mockResolvedValueOnce('fresh');
    const { cacheGet, cacheSet } = await import('../src/lib/metrics-cache');
    await cacheSet('refill-key', 'fresh', 300);
    const result = await cacheGet('refill-key');
    expect(result).toBe('fresh');
  });
});
