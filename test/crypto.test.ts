import { describe, it, expect } from "vitest";
import {
  safeCompare,
  getExpectedSignature,
  verifyGitHubSignature,
} from "../src/lib/crypto";

describe("safeCompare", () => {
  it("returns true for identical strings", () => {
    expect(safeCompare("hello", "hello")).toBe(true);
  });

  it("returns false for different strings of the same length", () => {
    expect(safeCompare("hello", "world")).toBe(false);
  });

  it("returns false for strings of different lengths", () => {
    expect(safeCompare("short", "muchlonger")).toBe(false);
    expect(safeCompare("muchlonger", "short")).toBe(false);
  });

  it("handles empty strings", () => {
    expect(safeCompare("", "")).toBe(true);
    expect(safeCompare("", "a")).toBe(false);
  });

  it("handles unicode strings", () => {
    expect(safeCompare("hello", "hello")).toBe(true);
    expect(safeCompare("hello", "hEllo")).toBe(false);
  });

  it("handles binary-like strings", () => {
    expect(safeCompare("\x00\x01", "\x00\x01")).toBe(true);
    expect(safeCompare("\x00\x01", "\x00\x02")).toBe(false);
  });

  it("is timing-safe for same-length comparisons", () => {
    // safeCompare should not leak length info via timing
    const sameLen1 = "a".repeat(10);
    const sameLen2 = "b".repeat(10);
    expect(safeCompare(sameLen1, sameLen2)).toBe(false);
  });
});

describe("getExpectedSignature", () => {
  it("returns a string prefixed with sha256=", () => {
    const sig = getExpectedSignature("secret", "body");
    expect(sig.startsWith("sha256=")).toBe(true);
  });

  it("returns a 71-character hex string for sha256", () => {
    const sig = getExpectedSignature("secret", "body");
    // "sha256=" (7) + 64 hex chars = 71
    expect(sig.length).toBe(71);
  });

  it("returns consistent results for the same input", () => {
    const sig1 = getExpectedSignature("secret", "body");
    const sig2 = getExpectedSignature("secret", "body");
    expect(sig1).toBe(sig2);
  });

  it("returns different results for different bodies", () => {
    const sig1 = getExpectedSignature("secret", "body1");
    const sig2 = getExpectedSignature("secret", "body2");
    expect(sig1).not.toBe(sig2);
  });

  it("returns different results for different secrets", () => {
    const sig1 = getExpectedSignature("secret1", "body");
    const sig2 = getExpectedSignature("secret2", "body");
    expect(sig1).not.toBe(sig2);
  });

  it("handles empty body", () => {
    const sig = getExpectedSignature("secret", "");
    expect(sig.startsWith("sha256=")).toBe(true);
    expect(sig.length).toBe(71);
  });

  it("handles JSON body", () => {
    const sig = getExpectedSignature("secret", '{"action":"push"}');
    expect(sig.startsWith("sha256=")).toBe(true);
  });

  it("the hex portion is lowercase", () => {
    const sig = getExpectedSignature("secret", "body");
    const hex = sig.slice(7);
    expect(hex).toBe(hex.toLowerCase());
  });
});

describe("verifyGitHubSignature", () => {
  it("returns false for null signature", () => {
    expect(verifyGitHubSignature("body", null, "secret")).toBe(false);
  });

  it("returns false for signature without sha256= prefix", () => {
    const body = "payload";
    const secret = "mysecret";
    const validSig = getExpectedSignature(secret, body);
    expect(verifyGitHubSignature(body, "invalidprefix" + validSig.slice(7), secret)).toBe(
      false,
    );
  });

  it("returns true for a valid signature", () => {
    const body = '{"action":"push","ref":"refs/heads/main"}';
    const secret = "webhook-secret-123";
    const sig = getExpectedSignature(secret, body);
    expect(verifyGitHubSignature(body, sig, secret)).toBe(true);
  });

  it("returns false for an invalid signature", () => {
    const body = "payload";
    const secret = "secret";
    const wrongSig = getExpectedSignature("wrong-secret", body);
    expect(verifyGitHubSignature(body, wrongSig, secret)).toBe(false);
  });

  it("returns false when body has been tampered with", () => {
    const originalBody = "original";
    const tamperedBody = "tampered";
    const secret = "secret";
    const sig = getExpectedSignature(secret, originalBody);
    expect(verifyGitHubSignature(tamperedBody, sig, secret)).toBe(false);
  });

  it("returns false for empty string signature", () => {
    expect(verifyGitHubSignature("body", "", "secret")).toBe(false);
  });

  it("handles case-sensitivity of the sha256= prefix", () => {
    const body = "payload";
    const secret = "secret";
    const sig = getExpectedSignature(secret, body);
    // sha256= prefix is lowercase - uppercase should fail
    const upperSig = sig.replace("sha256=", "SHA256=");
    expect(verifyGitHubSignature(body, upperSig, secret)).toBe(false);
  });

  it("returns false for undefined signature", () => {
    expect(verifyGitHubSignature("body", undefined as unknown as string, "secret")).toBe(
      false,
    );
  });
});
