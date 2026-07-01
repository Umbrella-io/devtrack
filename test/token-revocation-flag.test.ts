import { describe, it, expect, beforeEach, vi } from "vitest";

const mockRedisGet = vi.fn();
const mockRedisSet = vi.fn();

vi.mock("@upstash/redis", () => {
  return {
    Redis: vi.fn(function RedisMock() {
      return {
        get: mockRedisGet,
        set: mockRedisSet,
      };
    }),
  };
});

import {
  markTokenRevokedNow,
  wasTokenRevokedNow,
} from "../src/lib/token-revocation-flag";

describe("token-revocation-flag", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.UPSTASH_REDIS_REST_URL = "https://test-redis.example.com";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  });

  it("markTokenRevokedNow writes a flag with a TTL", async () => {
    mockRedisSet.mockResolvedValue("OK");

    await markTokenRevokedNow("12345");

    expect(mockRedisSet).toHaveBeenCalledWith(
      "auth:token-revoked:12345",
      "1",
      { ex: 5 * 60 }
    );
  });

  it("wasTokenRevokedNow returns true when the flag is set", async () => {
    mockRedisGet.mockResolvedValue("1");

    const result = await wasTokenRevokedNow("12345");

    expect(result).toBe(true);
    expect(mockRedisGet).toHaveBeenCalledWith("auth:token-revoked:12345");
  });

  it("wasTokenRevokedNow returns false when no flag was set", async () => {
    mockRedisGet.mockResolvedValue(null);

    const result = await wasTokenRevokedNow("12345");

    expect(result).toBe(false);
  });

  it("wasTokenRevokedNow returns false if Redis throws", async () => {
    mockRedisGet.mockRejectedValue(new Error("network error"));

    const result = await wasTokenRevokedNow("12345");

    expect(result).toBe(false);
  });

  it("markTokenRevokedNow does not throw if Redis throws", async () => {
    mockRedisSet.mockRejectedValue(new Error("network error"));

    await expect(markTokenRevokedNow("12345")).resolves.toBeUndefined();
  });
});
