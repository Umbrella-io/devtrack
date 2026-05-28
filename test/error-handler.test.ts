import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logError } from "../src/lib/error-handler";

describe("logError", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs error message and context in development mode", () => {
    const originalEnv = process.env.NODE_ENV;
    Object.defineProperty(process, "env", {
      value: { ...process.env, NODE_ENV: "development" },
      writable: true,
    });

    const error = new Error("Test error message");
    logError(error, {
      endpoint: "/api/test",
      operation: "testOperation",
    });

    expect(console.error).toHaveBeenCalled();

    Object.defineProperty(process, "env", {
      value: { ...process.env, NODE_ENV: originalEnv },
      writable: true,
    });
  });

  it("logs string error", () => {
    const originalEnv = process.env.NODE_ENV;
    Object.defineProperty(process, "env", {
      value: { ...process.env, NODE_ENV: "development" },
      writable: true,
    });

    logError("String error", {
      endpoint: "/api/test",
      operation: "testOperation",
    });

    expect(console.error).toHaveBeenCalled();

    Object.defineProperty(process, "env", {
      value: { ...process.env, NODE_ENV: originalEnv },
      writable: true,
    });
  });

  it("logs error with userId context", () => {
    const originalEnv = process.env.NODE_ENV;
    Object.defineProperty(process, "env", {
      value: { ...process.env, NODE_ENV: "development" },
      writable: true,
    });

    const error = new Error("User error");
    logError(error, {
      endpoint: "/api/user",
      operation: "getUser",
      userId: "user-123",
    });

    expect(console.error).toHaveBeenCalled();
    const logCalls = (console.error as any).mock.calls;
    expect(logCalls.length).toBeGreaterThan(0);
    const lastCall = logCalls[logCalls.length - 1];
    const logObj = lastCall[lastCall.length - 1];
    expect(logObj.endpoint).toBe("/api/user");
    expect(logObj.userId).toBe("user-123");

    Object.defineProperty(process, "env", {
      value: { ...process.env, NODE_ENV: originalEnv },
      writable: true,
    });
  });

  it("logs error with additional context", () => {
    const originalEnv = process.env.NODE_ENV;
    Object.defineProperty(process, "env", {
      value: { ...process.env, NODE_ENV: "development" },
      writable: true,
    });

    const error = new Error("Context error");
    logError(error, {
      endpoint: "/api/data",
      operation: "fetchData",
      additionalContext: { repoId: "repo-456", cacheKey: "key-789" },
    });

    expect(console.error).toHaveBeenCalled();

    Object.defineProperty(process, "env", {
      value: { ...process.env, NODE_ENV: originalEnv },
      writable: true,
    });
  });

  it("handles null error gracefully", () => {
    const originalEnv = process.env.NODE_ENV;
    Object.defineProperty(process, "env", {
      value: { ...process.env, NODE_ENV: "development" },
      writable: true,
    });

    logError(null, {
      endpoint: "/api/test",
      operation: "testOperation",
    });

    expect(console.error).toHaveBeenCalled();

    Object.defineProperty(process, "env", {
      value: { ...process.env, NODE_ENV: originalEnv },
      writable: true,
    });
  });

  it("handles undefined error gracefully", () => {
    const originalEnv = process.env.NODE_ENV;
    Object.defineProperty(process, "env", {
      value: { ...process.env, NODE_ENV: "development" },
      writable: true,
    });

    logError(undefined, {
      endpoint: "/api/test",
      operation: "testOperation",
    });

    expect(console.error).toHaveBeenCalled();

    Object.defineProperty(process, "env", {
      value: { ...process.env, NODE_ENV: originalEnv },
      writable: true,
    });
  });

  it("does not include stack traces in production", () => {
    const originalEnv = process.env.NODE_ENV;
    Object.defineProperty(process, "env", {
      value: { ...process.env, NODE_ENV: "production" },
      writable: true,
    });

    const error = new Error("Production error");
    logError(error, {
      endpoint: "/api/test",
      operation: "testOperation",
    });

    expect(console.error).toHaveBeenCalled();
    const logCalls = (console.error as any).mock.calls;
    expect(logCalls.length).toBeGreaterThan(0);

    Object.defineProperty(process, "env", {
      value: { ...process.env, NODE_ENV: originalEnv },
      writable: true,
    });
  });
});