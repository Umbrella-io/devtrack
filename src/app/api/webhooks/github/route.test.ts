import crypto from "crypto";
import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from "vitest";
import { safeCompare } from "./safe-compare";

describe("safeCompare", () => {
  let timingSafeEqualSpy: MockInstance;

  beforeEach(() => {
    // Vitest uses vi.spyOn to monitor module methods
    timingSafeEqualSpy = vi.spyOn(crypto, "timingSafeEqual");
  });

  afterEach(() => {
    // Clear mock data and restore original implementation
    timingSafeEqualSpy.mockRestore();
  });

  // Test Case 1: Early return optimization on length mismatch
  it("should return false immediately and not call timingSafeEqual when lengths differ", () => {
    const result = safeCompare("short", "muchlongerstring");

    expect(result).toBe(false);
    expect(timingSafeEqualSpy).not.toHaveBeenCalled();
  });

  // Test Case 2: Standard identical buffers
  it("should return true and call timingSafeEqual when buffers are identical", () => {
    const stringA = "secure_token_123";
    const stringB = "secure_token_123";

    const result = safeCompare(stringA, stringB);

    expect(result).toBe(true);
    expect(timingSafeEqualSpy).toHaveBeenCalledTimes(1);
  });

  // Test Case 3: Handles empty strings safely
  it("should handle empty strings correctly without throwing exceptions", () => {
    const result = safeCompare("", "");

    expect(result).toBe(true);
    expect(timingSafeEqualSpy).toHaveBeenCalledTimes(1);
  });

  // Test Case 4: Identical length but different content (Should trigger full timing check)
  it("should return false and call timingSafeEqual when lengths match but content differs", () => {
    const result = safeCompare("abc", "xyz");

    expect(result).toBe(false);
    expect(timingSafeEqualSpy).toHaveBeenCalledTimes(1);
  });
});