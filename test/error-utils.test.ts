import { describe, it, expect, vi } from "vitest";
import { getSafeApiErrorMessage } from "../src/lib/error-utils";

describe("getSafeApiErrorMessage", () => {
  it("returns known safe message for TokenRevoked", () => {
    expect(getSafeApiErrorMessage("TokenRevoked")).toBe(
      "Your GitHub session has expired. Please sign in again."
    );
  });

  it("returns known safe message for Unauthorized", () => {
    expect(getSafeApiErrorMessage("Unauthorized")).toBe(
      "You must be signed in to view this page."
    );
  });

  it("returns known safe message for Configuration error", () => {
    expect(getSafeApiErrorMessage("Configuration error")).toBe(
      "There is a configuration issue. Please contact support."
    );
  });

  it("returns generic message for unknown error in production", () => {
    expect(getSafeApiErrorMessage("UnknownError", "production")).toBe(
      "An unexpected error occurred."
    );
  });

  it("returns raw message for unknown error in development", () => {
    expect(getSafeApiErrorMessage("SomeError", "development")).toBe("SomeError");
  });

  it("defaults to production when env not provided and process.env.NODE_ENV is empty", () => {
    const originalEnv = process.env.NODE_ENV;
    // @ts-ignore
    delete process.env.NODE_ENV;
    try {
      expect(getSafeApiErrorMessage("RandomError")).toBe(
        "An unexpected error occurred."
      );
    } finally {
      // @ts-ignore
      process.env.NODE_ENV = originalEnv;
    }
  });

  it("handles empty string message in production", () => {
    expect(getSafeApiErrorMessage("", "production")).toBe(
      "An unexpected error occurred."
    );
  });

  it("handles empty string message in development", () => {
    expect(getSafeApiErrorMessage("", "development")).toBe("Unknown error");
  });
});
