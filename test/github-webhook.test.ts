import { vi, describe, it, expect } from "vitest";

// Mock @/lib/supabase to prevent environment variable errors on import
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

import { safeCompare, getExpectedSignature, verifyGitHubSignature } from "@/lib/crypto";

describe("webhook signature verification", () => {
  describe("safeCompare", () => {
    it("returns true for identical strings", () => {
      expect(safeCompare("abc", "abc")).toBe(true);
    });

    it("returns false for different-length strings", () => {
      expect(safeCompare("abc", "abcd")).toBe(false);
    });

    it("returns false for same-length but different content", () => {
      expect(safeCompare("abc", "xyz")).toBe(false);
    });

    it("returns true for empty strings", () => {
      expect(safeCompare("", "")).toBe(true);
    });

    it("returns false for empty vs non-empty", () => {
      expect(safeCompare("", "x")).toBe(false);
    });

    it("handles long strings correctly", () => {
      const long1 = "a".repeat(1000);
      const long2 = "a".repeat(1000);
      expect(safeCompare(long1, long2)).toBe(true);
      expect(safeCompare(long1, "b" + "a".repeat(999))).toBe(false);
    });
  });

  describe("verifyGitHubSignature", () => {
    const secret = "test-webhook-secret";
    const body = '{"action":"push","repository":"test"}';

    it("returns true for valid signature matching computed HMAC", () => {
      const validSignature = getExpectedSignature(secret, body);
      expect(verifyGitHubSignature(body, validSignature, secret)).toBe(true);
    });

    it("returns false for invalid signature", () => {
      const invalidSignature = "sha256=0000000000000000000000000000000000000000000000000000000000000000";
      expect(verifyGitHubSignature(body, invalidSignature, secret)).toBe(false);
    });

    it("returns false for missing signature", () => {
      expect(verifyGitHubSignature(body, null, secret)).toBe(false);
    });

    it("returns false for empty string signature", () => {
      expect(verifyGitHubSignature(body, "", secret)).toBe(false);
    });

    it("returns false for signature without sha256= prefix", () => {
      const sigWithoutPrefix = "0000000000000000000000000000000000000000000000000000000000000000";
      expect(verifyGitHubSignature(body, sigWithoutPrefix, secret)).toBe(false);
    });
  });

  describe("getExpectedSignature", () => {
    it("produces consistent HMAC for same inputs", () => {
      const sig1 = getExpectedSignature("secret", "body");
      const sig2 = getExpectedSignature("secret", "body");
      expect(sig1).toBe(sig2);
    });

    it("starts with sha256= prefix", () => {
      const sig = getExpectedSignature("secret", "body");
      expect(sig.startsWith("sha256=")).toBe(true);
    });
  });
});
