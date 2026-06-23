import { describe, it, expect, beforeEach } from "vitest";
import { getClientIp, createMemoryFixedWindowRateLimiter } from "../src/lib/rate-limit";
import type { NextRequest } from "next/server";

function makeMockRequest(headers: Record<string, string | undefined>): Pick<NextRequest, "headers"> {
  const h = new Map(Object.entries(headers).filter(([, v]) => v !== undefined));
  return {
    headers: {
      get: (name: string) => h.get(name) ?? null,
    },
  } as Pick<NextRequest, "headers">;
}

describe("getClientIp", () => {
  it("returns cf-connecting-ip when present", () => {
    const req = makeMockRequest({ "cf-connecting-ip": "1.2.3.4" });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("returns cf-connecting-ip trimmed of whitespace", () => {
    const req = makeMockRequest({ "cf-connecting-ip": "  1.2.3.4  " });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("returns x-real-ip when cf-connecting-ip is absent", () => {
    const req = makeMockRequest({ "x-real-ip": "5.6.7.8" });
    expect(getClientIp(req)).toBe("5.6.7.8");
  });

  it("returns x-forwarded-for first IP when cf and real are absent", () => {
    const req = makeMockRequest({ "x-forwarded-for": "10.0.0.1, 10.0.0.2, 10.0.0.3" });
    expect(getClientIp(req)).toBe("10.0.0.1");
  });

  it("returns x-forwarded-for trimmed of whitespace", () => {
    const req = makeMockRequest({ "x-forwarded-for": "  10.0.0.1  , 10.0.0.2" });
    expect(getClientIp(req)).toBe("10.0.0.1");
  });

  it("cf-connecting-ip takes precedence over x-real-ip", () => {
    const req = makeMockRequest({ "cf-connecting-ip": "1.1.1.1", "x-real-ip": "2.2.2.2" });
    expect(getClientIp(req)).toBe("1.1.1.1");
  });

  it("x-real-ip takes precedence over x-forwarded-for", () => {
    const req = makeMockRequest({ "x-real-ip": "3.3.3.3", "x-forwarded-for": "4.4.4.4, 4.4.4.5" });
    expect(getClientIp(req)).toBe("3.3.3.3");
  });

  it("returns unknown when no headers are present", () => {
    const req = makeMockRequest({});
    expect(getClientIp(req)).toBe("unknown");
  });

  it("returns unknown when all headers are empty strings", () => {
    const req = makeMockRequest({ "cf-connecting-ip": "", "x-real-ip": "", "x-forwarded-for": "" });
    expect(getClientIp(req)).toBe("unknown");
  });

  it("handles x-forwarded-for with single IP and no comma", () => {
    const req = makeMockRequest({ "x-forwarded-for": "7.7.7.7" });
    expect(getClientIp(req)).toBe("7.7.7.7");
  });
});

describe("createMemoryFixedWindowRateLimiter", () => {
  beforeEach(() => {
    // Ensure clean state per test
  });

  it("allows first request for a new key", () => {
    const { check } = createMemoryFixedWindowRateLimiter({ windowMs: 60_000 });
    const result = check("client-a", 10);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
  });

  it("allows requests up to the limit", () => {
    const { check } = createMemoryFixedWindowRateLimiter({ windowMs: 60_000 });
    for (let i = 0; i < 9; i++) {
      const result = check("client-a", 10);
      expect(result.allowed).toBe(true);
    }
    const lastAllowed = check("client-a", 10);
    expect(lastAllowed.allowed).toBe(true);
    expect(lastAllowed.remaining).toBe(0);
  });

  it("blocks request number limit + 1", () => {
    const { check } = createMemoryFixedWindowRateLimiter({ windowMs: 60_000 });
    for (let i = 0; i < 10; i++) {
      check("client-a", 10);
    }
    const result = check("client-a", 10);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("after window expires, next request is allowed again", () => {
    const { check } = createMemoryFixedWindowRateLimiter({ windowMs: 1000 });
    const now = Date.now();
    // Exhaust limit
    for (let i = 0; i < 10; i++) {
      check("client-a", 10, now);
    }
    const blocked = check("client-a", 10, now);
    expect(blocked.allowed).toBe(false);
    // After window expires
    const allowed = check("client-a", 10, now + 1001);
    expect(allowed.allowed).toBe(true);
    expect(allowed.remaining).toBe(9);
  });

  it("reset timestamp is now + windowMs / 1000", () => {
    const { check } = createMemoryFixedWindowRateLimiter({ windowMs: 60_000 });
    const now = Math.floor(Date.now() / 1000) * 1000; // align to seconds
    const result = check("client-a", 10, now);
    expect(result.reset).toBe(Math.ceil((now + 60_000) / 1000));
  });

  it("different keys are independent", () => {
    const { check } = createMemoryFixedWindowRateLimiter({ windowMs: 60_000 });
    for (let i = 0; i < 10; i++) {
      check("client-a", 10);
    }
    // client-a is exhausted
    expect(check("client-a", 10).allowed).toBe(false);
    // client-b is still fresh
    expect(check("client-b", 10).allowed).toBe(true);
  });

  it("works with custom windowMs", () => {
    const { check } = createMemoryFixedWindowRateLimiter({ windowMs: 5000 });
    const now = Math.floor(Date.now() / 1000) * 1000;
    const result = check("client-a", 5, now);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.reset).toBe(Math.ceil((now + 5000) / 1000));
  });

  it("remaining never goes negative", () => {
    const { check } = createMemoryFixedWindowRateLimiter({ windowMs: 60_000 });
    for (let i = 0; i < 20; i++) {
      check("client-a", 10);
    }
    const result = check("client-a", 10);
    expect(result.remaining).toBe(0);
  });
});
