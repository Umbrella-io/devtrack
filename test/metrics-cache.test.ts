import { describe, it, expect, vi, beforeEach } from "vitest";
import { metricsCacheKey, isMetricsCacheBypassed } from "../src/lib/metrics-cache";

describe("metricsCacheKey", () => {
  it("creates a cache key with userId and endpoint", () => {
    const key = metricsCacheKey("user123", "contributions");
    expect(key).toBe("metrics:user123:contributions:default");
  });

  it("includes sorted params in the cache key", () => {
    const key = metricsCacheKey("user123", "repos", { page: "1", limit: "10" });
    expect(key).toContain("limit=10");
    expect(key).toContain("page=1");
  });

  it("excludes null and undefined values", () => {
    const key = metricsCacheKey("user123", "prs", { page: undefined, limit: null });
    expect(key).toBe("metrics:user123:prs:default");
  });

  it("sorts params alphabetically", () => {
    const key = metricsCacheKey("user123", "streak", { z: "1", a: "2", m: "3" });
    expect(key).toBe("metrics:user123:streak:a=2&m=3&z=1");
  });
});

describe("isMetricsCacheBypassed", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns true when refresh param is '1'", async () => {
    const req = new Request("http://localhost?refresh=1");
    const { NextRequest } = await import("next/server");
    const nextReq = new NextRequest(req);
    expect(isMetricsCacheBypassed(nextReq)).toBe(true);
  });

  it("returns true when refresh param is 'true'", async () => {
    const req = new Request("http://localhost?refresh=true");
    const { NextRequest } = await import("next/server");
    const nextReq = new NextRequest(req);
    expect(isMetricsCacheBypassed(nextReq)).toBe(true);
  });

  it("returns true when bypassCache param is 'yes'", async () => {
    const req = new Request("http://localhost?bypassCache=yes");
    const { NextRequest } = await import("next/server");
    const nextReq = new NextRequest(req);
    expect(isMetricsCacheBypassed(nextReq)).toBe(true);
  });

  it("returns true when sync param is 'on'", async () => {
    const req = new Request("http://localhost?sync=on");
    const { NextRequest } = await import("next/server");
    const nextReq = new NextRequest(req);
    expect(isMetricsCacheBypassed(nextReq)).toBe(true);
  });

  it("returns false when no bypass params are present", async () => {
    const req = new Request("http://localhost?page=1");
    const { NextRequest } = await import("next/server");
    const nextReq = new NextRequest(req);
    expect(isMetricsCacheBypassed(nextReq)).toBe(false);
  });

  it("returns true when x-devtrack-cache-bypass header is set", async () => {
    const req = new Request("http://localhost", {
      headers: { "x-devtrack-cache-bypass": "true" },
    });
    const { NextRequest } = await import("next/server");
    const nextReq = new NextRequest(req);
    expect(isMetricsCacheBypassed(nextReq)).toBe(true);
  });
});
