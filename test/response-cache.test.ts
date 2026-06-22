import { describe, it, expect } from "vitest";
import { setResponseCacheHeader } from "../src/lib/response-cache";

describe("response-cache core headers validation matrix", () => {
  it("should successfully apply valid cache-control headers when matching valid parameters", () => {
    const mockHeaders = new Headers();
    const mockResponse = {
      headers: mockHeaders,
    };

    // Force-cast as any to bypass extended monorepo Edge/Next response interface constraints entirely
    setResponseCacheHeader(mockResponse as any, 3600);

    expect(mockHeaders.get("Cache-Control")).toBe("public, max-age=3600, s-maxage=3600, stale-while-revalidate=60");
  });

  it("should handle error boundaries gracefully if the duration argument resolves to negative or zero", () => {
    const mockHeaders = new Headers();
    const mockResponse = {
      headers: mockHeaders,
    };

    setResponseCacheHeader(mockResponse as any, 0);

    expect(mockHeaders.get("Cache-Control")).toBe("public, max-age=0, s-maxage=0, stale-while-revalidate=60");
  });

  it("should verify the header configuration tracks properly using simulated mutable map inputs", () => {
    const headerMap = new Map<string, string>();
    const mockResponse = {
      headers: {
        set: (key: string, value: string) => headerMap.set(key, value),
        get: (key: string) => headerMap.get(key),
      },
    };

    setResponseCacheHeader(mockResponse as any, 86400);

    expect(mockResponse.headers.get("Cache-Control")).toContain("max-age=86400");
  });
});

