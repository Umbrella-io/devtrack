import { describe, it, expect, beforeEach, vi } from "vitest";
import { getUpstashConfig, upstashPipeline, upstashRateLimitFixedWindow, upstashTryAcquireLock } from "../src/lib/upstash-rest";
describe("getUpstashConfig", () => {
  beforeEach(() => { delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.UPSTASH_REDIS_REST_TOKEN; });
  it("returns null when neither env var is set", () => { expect(getUpstashConfig()).toBeNull(); });
  it("returns null when only URL is set", () => { process.env.UPSTASH_REDIS_REST_URL = "https://test.upstash.io"; expect(getUpstashConfig()).toBeNull(); });
  it("returns null when only token is set", () => { process.env.UPSTASH_REDIS_REST_TOKEN = "token123"; expect(getUpstashConfig()).toBeNull(); });
  it("returns config when both env vars are set", () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://test.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token123";
    expect(getUpstashConfig()).toEqual({ url: "https://test.upstash.io", token: "token123" });
  });
});
describe("upstashPipeline", () => {
  beforeEach(() => { delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.UPSTASH_REDIS_REST_TOKEN; vi.restoreAllMocks(); });
  it("returns empty array when not configured", async () => { expect(await upstashPipeline([["GET","key"]])).toEqual([]); });
  it("returns empty array when fetch fails", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://test.upstash.io"; process.env.UPSTASH_REDIS_REST_TOKEN = "token123";
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 500 })) as unknown as typeof fetch;
    expect(await upstashPipeline([["GET","key"]])).toEqual([]);
  });
  it("returns parsed JSON on success", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://test.upstash.io"; process.env.UPSTASH_REDIS_REST_TOKEN = "token123";
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify([{result:"OK"}]), {status:200,headers:{"content-type":"application/json"}})) as unknown as typeof fetch;
    expect(await upstashPipeline([["SET","key","value"]])).toEqual([{result:"OK"}]);
  });
});
describe("upstashRateLimitFixedWindow", () => {
  beforeEach(() => { delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.UPSTASH_REDIS_REST_TOKEN; vi.restoreAllMocks(); });
  it("returns allowed when not configured", async () => { expect(await upstashRateLimitFixedWindow({key:"test",limit:5,windowSeconds:60})).toEqual({allowed:true}); });
  it("returns allowed when upstash fetch fails", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://test.upstash.io"; process.env.UPSTASH_REDIS_REST_TOKEN = "token123";
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(null,{status:500})) as unknown as typeof fetch;
    expect(await upstashRateLimitFixedWindow({key:"test",limit:5,windowSeconds:60})).toEqual({allowed:true});
  });
  it("returns allowed when count is NaN", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://test.upstash.io"; process.env.UPSTASH_REDIS_REST_TOKEN = "token123";
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify([{result:NaN},{result:60}]),{status:200,headers:{"content-type":"application/json"}})) as unknown as typeof fetch;
    expect(await upstashRateLimitFixedWindow({key:"test",limit:5,windowSeconds:60})).toEqual({allowed:true});
  });
  it("returns not allowed when count exceeds limit", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://test.upstash.io"; process.env.UPSTASH_REDIS_REST_TOKEN = "token123";
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify([{result:10},{result:45}]),{status:200,headers:{"content-type":"application/json"}})) as unknown as typeof fetch;
    expect(await upstashRateLimitFixedWindow({key:"test",limit:5,windowSeconds:60})).toEqual({allowed:false,retryAfter:45});
  });
});
describe("upstashTryAcquireLock", () => {
  beforeEach(() => { delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.UPSTASH_REDIS_REST_TOKEN; vi.restoreAllMocks(); });
  it("returns false when not configured", async () => { expect(await upstashTryAcquireLock({key:"lock:test",ttlSeconds:10})).toBe(false); });
  it("returns true when SET returns OK", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://test.upstash.io"; process.env.UPSTASH_REDIS_REST_TOKEN = "token123";
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify([{result:"OK"}]),{status:200,headers:{"content-type":"application/json"}})) as unknown as typeof fetch;
    expect(await upstashTryAcquireLock({key:"lock:test",ttlSeconds:10})).toBe(true);
  });
  it("returns false when SET returns null", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://test.upstash.io"; process.env.UPSTASH_REDIS_REST_TOKEN = "token123";
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify([{result:null}]),{status:200,headers:{"content-type":"application/json"}})) as unknown as typeof fetch;
    expect(await upstashTryAcquireLock({key:"lock:test",ttlSeconds:10})).toBe(false);
  });
});
