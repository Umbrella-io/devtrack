import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@upstash/redis', () => {
  const MockRedis = vi.fn(function() { return {}; });
  return { Redis: MockRedis };
});

describe('getRedisClient lazy initialization', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns null when UPSTASH_REDIS_REST_URL is not set', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const { getRedisClient } = await import('../src/lib/metrics-cache');
    const client = getRedisClient();
    expect(client).toBeNull();
  });

  it('returns null when UPSTASH_REDIS_REST_TOKEN is not set', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const { getRedisClient } = await import('../src/lib/metrics-cache');
    const client = getRedisClient();
    expect(client).toBeNull();
  });

  it('returns Redis instance when both env vars are set', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token-123';

    const { getRedisClient } = await import('../src/lib/metrics-cache');
    const client = getRedisClient();
    expect(client).not.toBeNull();
    expect(client).toBeDefined();
  });

  it('returns same singleton instance on repeated calls', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token-123';

    const { getRedisClient } = await import('../src/lib/metrics-cache');
    const client1 = getRedisClient();
    const client2 = getRedisClient();
    expect(client1).toBe(client2);
  });
});