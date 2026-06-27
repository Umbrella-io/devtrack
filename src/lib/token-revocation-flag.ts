import { getRedisClient } from "@/lib/metrics-cache";

const REVOKED_FLAG_TTL_SECONDS = 5 * 60;

function revokedFlagKey(githubId: string): string {
  return `auth:token-revoked:${githubId}`;
}

export async function markTokenRevokedNow(githubId: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;
  try {
    await redis.set(revokedFlagKey(githubId), "1", { ex: REVOKED_FLAG_TTL_SECONDS });
  } catch {
    // Best-effort only; the 24h periodic check in auth.ts is the fallback.
  }
}

export async function wasTokenRevokedNow(githubId: string): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;
  try {
    const value = await redis.get<string>(revokedFlagKey(githubId));
    return value === "1";
  } catch {
    return false;
  }
}
