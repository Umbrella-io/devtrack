import { describe, it, expect } from "vitest";
import { metricsCacheKey } from "@/lib/metrics-cache";

describe("metricsCacheKey param serialization edge cases", () => {
  it("filters out null and undefined values", () => {
    const key = metricsCacheKey("user-1", "prs", {
      page: null,
      limit: undefined,
      githubLogin: "test"
    });
    expect(key).toBe("metrics:user-1:prs:githubLogin=test");
  });

  it("includes numeric zero in cache key", () => {
    const key = metricsCacheKey("user-1", "contributions", {
      page: 0
    });
    expect(key).toBe("metrics:user-1:contributions:page=0");
  });

  it("serializes false boolean values", () => {
    const key = metricsCacheKey("user-1", "repos", {
      active: false
    });
    expect(key).toBe("metrics:user-1:repos:active=false");
  });
});

