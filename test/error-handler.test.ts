import { afterEach, describe, expect, it, vi } from "vitest";

describe("logError", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("logs a readable message with full context in development mode", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { logError } = await import("@/lib/error-handler");
    const error = new Error("GitHub webhook failed");

    logError(error, {
      endpoint: "/api/webhooks/github",
      operation: "sync-payload",
      userId: "user-123",
      additionalContext: {
        deliveryId: "evt_456",
        installationId: 99,
      },
    });

    expect(errorSpy).toHaveBeenCalledTimes(1);

    const [message, logEntry] = errorSpy.mock.calls[0];

    expect(message).toMatch(
      /^\[[^\]]+\] \/api\/webhooks\/github - sync-payload:$/,
    );
    expect(logEntry).toMatchObject({
      endpoint: "/api/webhooks/github",
      operation: "sync-payload",
      userId: "user-123",
      error: "GitHub webhook failed",
      deliveryId: "evt_456",
      installationId: 99,
    });
    expect(logEntry.timestamp).toEqual(expect.any(String));
    expect(Date.parse(logEntry.timestamp)).not.toBeNaN();
    expect(logEntry.stack).toContain("GitHub webhook failed");
  });

  it("serializes a production-safe payload without stack traces", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { logError } = await import("@/lib/error-handler");

    logError(new Error("Leaderboard sync exploded"), {
      endpoint: "/api/leaderboard",
      operation: "fetch-stats",
      additionalContext: {
        source: "github",
      },
    });

    expect(errorSpy).toHaveBeenCalledTimes(1);

    const [serializedLog] = errorSpy.mock.calls[0];
    expect(typeof serializedLog).toBe("string");

    const parsedLog = JSON.parse(serializedLog as string);
    expect(parsedLog).toMatchObject({
      endpoint: "/api/leaderboard",
      operation: "fetch-stats",
      error: "Leaderboard sync exploded",
      source: "github",
    });
    expect(parsedLog.timestamp).toEqual(expect.any(String));
    expect(parsedLog.stack).toBeUndefined();
  });
});
