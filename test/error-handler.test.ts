import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logError } from "../src/lib/error-handler";

describe("error-handler", () => {
  let consoleSpy: any;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("should log error message and context in production mode", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    try {
      const error = new Error("Test db timeout");
      logError(error, {
        endpoint: "/api/metrics",
        operation: "fetchData",
        userId: "user-123",
      });

      expect(consoleSpy).toHaveBeenCalled();
      const firstCall = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(firstCall);

      expect(parsed.endpoint).toBe("/api/metrics");
      expect(parsed.operation).toBe("fetchData");
      expect(parsed.userId).toBe("user-123");
      expect(parsed.error).toBe("Test db timeout");
      expect(parsed.stack).toBeUndefined(); // Should be omitted in production
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it("should log error stack in development mode", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    try {
      const error = new Error("Dev mode failure");
      logError(error, {
        endpoint: "/api/metrics",
        operation: "testDev",
        additionalContext: { source: "test" },
      });

      expect(consoleSpy).toHaveBeenCalled();
      const logEntry = consoleSpy.mock.calls[0][1];
      expect(logEntry.error).toBe("Dev mode failure");
      expect(logEntry.stack).toBeDefined();
      expect(logEntry.source).toBe("test");
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});
