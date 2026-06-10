type UpstashConfig = { url: string; token: string };

/**
 * Retrieves the Upstash Redis REST configuration credentials from environment variables.
 * @returns The Upstash Redis configuration object, or null if credentials are not configured.
 */
export function getUpstashConfig(): UpstashConfig | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return null;
  }
  return { url, token };
}

/**
 * Sends a pipeline of multiple commands to Upstash Redis in a single HTTP request.
 * @param commands - An array of Redis commands, where each command is an array of strings or numbers.
 * @returns A promise resolving to an array of command results and errors.
 */
export async function upstashPipeline(
  commands: Array<Array<string | number>>
): Promise<Array<{ result?: unknown; error?: string }>> {
  const config = getUpstashConfig();
  if (!config) {
    return [];
  }

  const res = await fetch(`${config.url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
    cache: "no-store",
  });

  if (!res.ok) {
    return [];
  }

  return (await res.json()) as Array<{ result?: unknown; error?: string }>;
}

/**
 * Implements a fixed-window rate limiter using Upstash Redis pipeline operations.
 * Increments the request counter and applies expiration/TTL if needed.
 * @param options - Configuration options for rate limiting.
 * @param options.key - The unique rate limit key (e.g. based on IP or action).
 * @param options.limit - The maximum number of allowed requests in the window.
 * @param options.windowSeconds - The duration of the rate limit window in seconds.
 * @returns A promise resolving to an object indicating if the request is allowed and when to retry.
 */
export async function upstashRateLimitFixedWindow(options: {
  key: string;
  limit: number;
  windowSeconds: number;
}): Promise<{ allowed: boolean; retryAfter?: number }> {
  const results = await upstashPipeline([
    ["INCR", options.key],
    ["TTL", options.key],
  ]);

  const count = Number(results[0]?.result ?? NaN);
  const ttl = Number(results[1]?.result ?? NaN);

  if (!Number.isFinite(count)) {
    return { allowed: true };
  }

  // ttl values: -2 (no key), -1 (no expiry), or >= 0
  if (!Number.isFinite(ttl) || ttl < 0) {
    // Best-effort: ensure the key expires to avoid leaks.
    await upstashPipeline([["EXPIRE", options.key, options.windowSeconds]]);
    if (count > options.limit) {
      return { allowed: false, retryAfter: options.windowSeconds };
    }
    return { allowed: true };
  }

  if (count === 1) {
    await upstashPipeline([["EXPIRE", options.key, options.windowSeconds]]);
  }

  if (count > options.limit) {
    return { allowed: false, retryAfter: Math.max(ttl, 1) };
  }

  return { allowed: true };
}

/**
 * Attempts to acquire a distributed lock using Upstash Redis SET NX EX command.
 * @param options - Lock acquisition options.
 * @param options.key - The unique lock key.
 * @param options.ttlSeconds - Time-to-live for the lock in seconds.
 * @param options.value - Optional value to identify the lock owner. Defaults to a timestamp-random string.
 * @returns A promise resolving to true if the lock was successfully acquired, false otherwise.
 */
export async function upstashTryAcquireLock(options: {
  key: string;
  ttlSeconds: number;
  value?: string;
}): Promise<boolean> {
  const value = options.value ?? `${Date.now()}:${Math.random().toString(36).slice(2)}`;
  const results = await upstashPipeline([
    ["SET", options.key, value, "NX", "EX", options.ttlSeconds],
  ]);

  // Upstash returns "OK" when set, null when not set.
  return results[0]?.result === "OK";
}

