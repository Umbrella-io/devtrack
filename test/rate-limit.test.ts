/**
 * Tests for src/lib/rate-limit.ts
 *
 * Coverage
 * --------
 * getClientIp                     -- cf-connecting-ip, x-real-ip, x-forwarded-for, unknown
 * createMemoryFixedWindowRateLimiter -- allowed first request, limit enforcement,
 *                                        window reset, remaining count, prune
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getClientIp, createMemoryFixedWindowRateLimiter } from "../src/lib/rate-limit";

describe("getClientIp", () => {
  function makeReq(headers: Record<string, string | undefined>) {
    return {
      headers: {
        get: (name: string): string | undefined => headers[name] ?? undefined,
      },
    } as Parameters<typeof getClientIp>[0];
  }

  it("prefers cf-connecting-ip", () => {
    const req = makeReq({ "cf-connecting-ip": "1.2.3.4", "x-real-ip": "5.6.7.8" });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip when cf-connecting-ip is absent", () => {
    const req = makeReq({ "cf-connecting-ip": undefined, "x-real-ip": "5.6.7.8" });
    expect(getClientIp(req)).toBe("5.6.7.8");
  });

  it("uses first entry of x-forwarded-for when others are absent", () => {
    const req = makeReq({ "cf-connecting-ip": undefined, "x-real-ip": undefined, "x-forwarded-for": "9.9.9.9, 10.10.10.10" });
    expect(getClientIp(req)).toBe("9.9.9.9");
  });

  it("trims whitespace from IPs", () => {
    const req = makeReq({ "cf-connecting-ip": "  1.1.1.1  ", "x-real-ip": undefined });
    expect(getClientIp(req)).toBe("1.1.1.1");
  });

  it("returns unknown when no headers are present", () => {
    const req = makeReq({});
    expect(getClientIp(req)).toBe("unknown");
  });
});

describe("createMemoryFixedWindowRateLimiter", () => {
  let limiter: ReturnType<typeof createMemoryFixedWindowRateLimiter>;
  let now: number;

  beforeEach(() => {
    now = 1_700_000_000_000;
    vi.spyOn(Date, "now").mockReturnValue(now);
    limiter = createMemoryFixedWindowRateLimiter({ windowMs: 60_000 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function advance(ms: number) {
    now += ms;
    vi.spyOn(Date, "now").mockReturnValue(now);
  }

  it("allows the first request for a new key", () => {
    const result = limiter.check("client-a", 5);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.reset).toBe(Math.ceil((now + 60_000) / 1000));
  });

  it("allows requests up to the limit", () => {
    const results = Array.from({ length: 5 }, () => limiter.check("client-a", 5));
    results.forEach((r, i) => {
      expect(r.allowed).toBe(true);
      expect(r.remaining).toBe(4 - i);
    });
  });

  it("blocks requests beyond the limit", () => {
    for (let i = 0; i < 5; i++) limiter.check("client-a", 5);
    const result = limiter.check("client-a", 5);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("resets the window after the expiry period", () => {
    for (let i = 0; i < 5; i++) limiter.check("client-a", 5);
    advance(60_000);
    const result = limiter.check("client-a", 5);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("maintains independent buckets per key", () => {
    limiter.check("client-a", 5);
    limiter.check("client-a", 5);
    limiter.check("client-a", 5);
    const b = limiter.check("client-b", 5);
    expect(b.allowed).toBe(true);
    expect(b.remaining).toBe(4);
  });

  it("returns correct reset unix seconds", () => {
    const result = limiter.check("client-a", 5);
    expect(result.reset).toBe(Math.ceil((now + 60_000) / 1000));
  });
});
