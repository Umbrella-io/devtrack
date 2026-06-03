import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
export const redis = new Redis(redisUrl);

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

export async function getCachedData<T>(key: string, fetchFn: () => Promise<T>, ttlSeconds = 300): Promise<T> {
  try {
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }
  } catch (err) {
    console.error('Redis cache GET error:', err);
  }

  const data = await fetchFn();

  try {
    const ttl = Math.max(1, Math.floor(ttlSeconds));
    await redis.set(key, JSON.stringify(data), 'EX', ttl);
  } catch (err) {
    console.error('Redis cache SET error:', err);
  }

  return data;
}
