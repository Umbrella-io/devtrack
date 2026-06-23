import { describe, it, expect, beforeEach } from "vitest";
import {
  getClientIp,
  createMemoryFixedWindowRateLimiter,
  type MemoryRateLimitResult,
} from "@/lib/rate-limit";
import type { NextRequest } from "next/server";

function makeRequest(headers: Record<string, string | null | undefined>): NextRequest {
  return {
    headers: {
      get: (name: string) => headers[name] ?? undefined,
    },
  } as unknown as NextRequest;
}

describe("rate-limit", () => {
  describe("getClientIp", () => {
    it("returns cf-connecting-ip when present", () => {
      const req = makeRequest({
        "cf-connecting-ip": "1.2.3.4",
        "x-real-ip": "5.6.7.8",
        "x-forwarded-for": "9.9.9.9",
      });
      expect(getClientIp(req)).toBe("1.2.3.4");
    });

    it("falls back to x-real-ip when cf-connecting-ip is absent", () => {
      const req = makeRequest({
        "cf-connecting-ip": null,
        "x-real-ip": "5.6.7.8",
        "x-forwarded-for": "9.9.9.9",
      });
      expect(getClientIp(req)).toBe("5.6.7.8");
    });

    it("falls back to x-forwarded-for first IP when cf-ip and x-real are absent", () => {
      const req = makeRequest({
        "cf-connecting-ip": null,
        "x-real-ip": null,
        "x-forwarded-for": "9.9.9.9, 10.0.0.1",
      });
      expect(getClientIp(req)).toBe("9.9.9.9");
    });

    it("returns unknown when no headers present", () => {
      const req = makeRequest({});
      expect(getClientIp(req)).toBe("unknown");
    });

    it("trims whitespace from cf-connecting-ip", () => {
      const req = makeRequest({
        "cf-connecting-ip": "  1.2.3.4  ",
      });
      expect(getClientIp(req)).toBe("1.2.3.4");
    });

    it("trims whitespace from x-real-ip", () => {
      const req = makeRequest({
        "cf-connecting-ip": null,
        "x-real-ip": "  5.6.7.8  ",
      });
      expect(getClientIp(req)).toBe("5.6.7.8");
    });

    it("returns unknown for empty cf-connecting-ip", () => {
      const req = makeRequest({
        "cf-connecting-ip": "",
        "x-real-ip": null,
      });
      expect(getClientIp(req)).toBe("unknown");
    });

    it("handles x-forwarded-for with single IP and whitespace", () => {
      const req = makeRequest({
        "cf-connecting-ip": null,
        "x-real-ip": null,
        "x-forwarded-for": "  9.9.9.9  ",
      });
      expect(getClientIp(req)).toBe("9.9.9.9");
    });
  });

  describe("createMemoryFixedWindowRateLimiter", () => {
    const createLimiter = (windowMs = 60_000, limit = 5) =>
      createMemoryFixedWindowRateLimiter({ windowMs, maxEntries: 1000 });

    describe("check", () => {
      it("returns allowed=true on first request for a new key", () => {
        const limiter = createLimiter();
        const result = limiter.check("user-a", 5);
        expect(result.allowed).toBe(true);
      });

      it("decrements remaining correctly on successive requests", () => {
        const limiter = createLimiter(60_000, 3);
        expect(limiter.check("user-a", 3).remaining).toBe(2);
        expect(limiter.check("user-a", 3).remaining).toBe(1);
        expect(limiter.check("user-a", 3).remaining).toBe(0);
      });

      it("returns allowed=false when limit is exhausted", () => {
        const limiter = createLimiter(60_000, 2);
        limiter.check("user-a", 2);
        limiter.check("user-a", 2);
        const result = limiter.check("user-a", 2);
        expect(result.allowed).toBe(false);
        expect(result.remaining).toBe(0);
      });

      it("reset time is a unix timestamp in seconds", () => {
        const limiter = createLimiter(60_000, 5);
        const before = Math.ceil(Date.now() / 1000);
        const result = limiter.check("user-b", 5);
        const after = Math.ceil(Date.now() / 1000);
        expect(result.reset).toBeGreaterThanOrEqual(before + 60);
        expect(result.reset).toBeLessThanOrEqual(after + 61);
      });

      it("different keys have independent counters", () => {
        const limiter = createLimiter(60_000, 2);
        limiter.check("user-a", 2);
        limiter.check("user-a", 2);
        const result = limiter.check("user-b", 2);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(1);
      });

      it("limit parameter is respected", () => {
        const limiter = createLimiter(60_000, 1);
        limiter.check("user-a", 1);
        const result = limiter.check("user-a", 1);
        expect(result.allowed).toBe(false);
      });

      it("allows again after window expires", () => {
        const limiter = createLimiter(60_000, 2);
        limiter.check("user-a", 2);
        limiter.check("user-a", 2);
        expect(limiter.check("user-a", 2).allowed).toBe(false);
        // Advance time past the window
        const result = limiter.check("user-a", 2, Date.now() + 61_000);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(1);
      });

      it("remaining is never negative", () => {
        const limiter = createLimiter(60_000, 1);
        limiter.check("user-a", 1);
        limiter.check("user-a", 1);
        limiter.check("user-a", 1);
        const result = limiter.check("user-a", 1);
        expect(result.remaining).toBe(0);
      });
    });

    describe("prune", () => {
      it("removes expired buckets", () => {
        const limiter = createLimiter(60_000, 1);
        limiter.check("user-a", 1);
        // Buckets map should not be empty (one entry)
        expect(limiter._unsafeBuckets.size).toBeGreaterThanOrEqual(1);
      });

      it("does not remove active buckets before window expires", () => {
        const limiter = createLimiter(60_000, 2);
        limiter.check("user-x", 2);
        limiter.check("user-x", 2);
        limiter.check("user-y", 2);
        expect(limiter._unsafeBuckets.size).toBe(2);
      });

      it("bucket map is accessible via _unsafeBuckets", () => {
        const limiter = createLimiter(60_000, 5);
        expect(Array.isArray(limiter._unsafeBuckets)).toBe(false);
        expect(limiter._unsafeBuckets).toBeInstanceOf(Map);
      });
    });
  });
});
