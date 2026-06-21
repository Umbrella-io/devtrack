import { describe, it, expect, beforeEach } from "vitest";
import { getClientIp, createMemoryFixedWindowRateLimiter } from "../src/lib/rate-limit";
import type { NextRequest } from "next/server";

function makeRequest(headers: Record<string, string>): NextRequest {
  return {
    headers: {
      get: (name: string) => {
        const k = name.toLowerCase();
        for (const key of Object.keys(headers)) {
          if (key.toLowerCase() === k) return headers[key] ?? null;
        }
        return null;
      },
    },
  } as unknown as NextRequest;
}

describe("getClientIp", () => {
  it("returns cf-connecting-ip when present", () => {
    const req = makeRequest({ "cf-connecting-ip": "1.2.3.4" });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("returns x-real-ip when cf-connecting-ip is absent", () => {
    const req = makeRequest({ "x-real-ip": "5.6.7.8" });
    expect(getClientIp(req)).toBe("5.6.7.8");
  });

  it("returns first IP from x-forwarded-for when others are absent", () => {
    const req = makeRequest({ "x-forwarded-for": "10.0.0.1, 10.0.0.2, 10.0.0.3" });
    expect(getClientIp(req)).toBe("10.0.0.1");
  });

  it("cf-connecting-ip takes priority over x-real-ip", () => {
    const req = makeRequest({ "cf-connecting-ip": "1.1.1.1", "x-real-ip": "2.2.2.2" });
    expect(getClientIp(req)).toBe("1.1.1.1");
  });

  it("x-real-ip takes priority over x-forwarded-for", () => {
    const req = makeRequest({ "x-real-ip": "9.9.9.9", "x-forwarded-for": "1.1.1.1" });
    expect(getClientIp(req)).toBe("9.9.9.9");
  });

  it("returns unknown when no headers present", () => {
    const req = makeRequest({});
    expect(getClientIp(req)).toBe("unknown");
  });

  it("returns unknown when all IP headers are empty strings", () => {
    const req = makeRequest({ "cf-connecting-ip": "", "x-real-ip": "", "x-forwarded-for": "" });
    expect(getClientIp(req)).toBe("unknown");
  });

  it("trims whitespace from IP values", () => {
    const req = makeRequest({ "cf-connecting-ip": "  1.2.3.4  " });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });
});

describe("createMemoryFixedWindowRateLimiter", () => {
  it("allows first request within limit", () => {
    const limiter = createMemoryFixedWindowRateLimiter({ windowMs: 1000, maxEntries: 100 });
    const result = limiter.check("user-1", 5);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("denies requests after limit is reached", () => {
    const limiter = createMemoryFixedWindowRateLimiter({ windowMs: 10000, maxEntries: 100 });
    for (let i = 0; i < 3; i++) {
      limiter.check("user-2", 3);
    }
    const result = limiter.check("user-2", 3);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("resets after the window expires", () => {
    const limiter = createMemoryFixedWindowRateLimiter({ windowMs: 50, pruneIntervalMs: 10, maxEntries: 100 });
    limiter.check("user-3", 2);
    limiter.check("user-3", 2);
    // After window expires (now + 100ms), a new request should be allowed
    const result = limiter.check("user-3", 2, Date.now() + 100);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
  });

  it("resets per-key independently", () => {
    const limiter = createMemoryFixedWindowRateLimiter({ windowMs: 10000, maxEntries: 100 });
    limiter.check("user-4a", 1);
    limiter.check("user-4a", 1);
    // user-4b should still be allowed
    const result = limiter.check("user-4b", 1);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it("allows request again after the window expires", () => {
    const limiter = createMemoryFixedWindowRateLimiter({ windowMs: 50, pruneIntervalMs: 10, maxEntries: 100 });
    const t0 = Date.now();
    limiter.check("user-5", 1, t0);
    limiter.check("user-5", 1, t0 + 100);
    // Should be allowed again since the bucket expired (resetAt = t0 + 50, now = t0 + 200)
    const result = limiter.check("user-5", 1, t0 + 200);
    expect(result.allowed).toBe(true);
  });

  it("returns correct reset unix timestamp", () => {
    const limiter = createMemoryFixedWindowRateLimiter({ windowMs: 5000, maxEntries: 100 });
    const now = Date.now();
    const result = limiter.check("user-6", 3, now);
    expect(result.reset).toBe(Math.ceil((now + 5000) / 1000));
  });
});
