import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  encryptToken,
  decryptToken,
  safeCompare,
  getExpectedSignature,
  verifyGitHubSignature,
} from "../src/lib/crypto";

// A valid 64-char hex string = 32 bytes
const VALID_KEY = "a".repeat(64);

describe("crypto", () => {
  beforeAll(() => {
    process.env.ENCRYPTION_KEY = VALID_KEY;
  });

  afterAll(() => {
    delete process.env.ENCRYPTION_KEY;
  });

  describe("encryptToken", () => {
    it("returns an object with encrypted and iv keys", () => {
      const result = encryptToken("hello world");
      expect(result).toHaveProperty("encrypted");
      expect(result).toHaveProperty("iv");
    });

    it("encrypted value is a non-empty hex string", () => {
      const { encrypted } = encryptToken("hello world");
      expect(encrypted).toMatch(/^[0-9a-f]+$/);
      expect(encrypted.length).toBeGreaterThan(0);
    });

    it("iv value is a non-empty hex string of expected length (24 chars for 12 bytes)", () => {
      const { iv } = encryptToken("hello world");
      expect(iv).toMatch(/^[0-9a-f]+$/);
      expect(iv.length).toBe(24); // 12 bytes * 2 hex chars
    });

    it("produces different ciphertext for the same plaintext (due to random IV)", () => {
      const result1 = encryptToken("same text");
      const result2 = encryptToken("same text");
      expect(result1.encrypted).not.toBe(result2.encrypted);
      expect(result1.iv).not.toBe(result2.iv);
    });

    it("handles empty string plaintext", () => {
      const result = encryptToken("");
      expect(result.encrypted).toMatch(/^[0-9a-f]+$/);
      expect(result.iv.length).toBe(24);
    });

    it("handles unicode plaintext", () => {
      const result = encryptToken("hello \u4e16\u754c \ud83d\ude80");
      expect(result.encrypted).toMatch(/^[0-9a-f]+$/);
      expect(result.iv.length).toBe(24);
    });
  });

  describe("decryptToken", () => {
    it("correctly decrypts output of encryptToken back to original plaintext", () => {
      const plaintext = "hello world";
      const { encrypted, iv } = encryptToken(plaintext);
      const decrypted = decryptToken(encrypted, iv);
      expect(decrypted).toBe(plaintext);
    });

    it("returns null for tampered ciphertext", () => {
      const { encrypted, iv } = encryptToken("original");
      const tampered = encrypted.replace(/[0-9a-f]/, (m) =>
        m === "0" ? "1" : "0",
      );
      const decrypted = decryptToken(tampered, iv);
      expect(decrypted).toBeNull();
    });

    it("returns null for invalid IV (wrong length)", () => {
      const { encrypted } = encryptToken("hello");
      const result = decryptToken(encrypted, "notavalidiv");
      expect(result).toBeNull();
    });

    it("returns null for completely invalid ciphertext (non-hex)", () => {
      const result = decryptToken("nothex!", "0".repeat(24));
      expect(result).toBeNull();
    });

    it("returns null when ciphertext is too short (no auth tag)", () => {
      const result = decryptToken("0".repeat(10), "0".repeat(24));
      expect(result).toBeNull();
    });

    it("handles unicode plaintext roundtrip correctly", () => {
      const plaintext = "hello \u4e16\u754c \ud83d\ude80";
      const { encrypted, iv } = encryptToken(plaintext);
      const decrypted = decryptToken(encrypted, iv);
      expect(decrypted).toBe(plaintext);
    });
  });

  describe("safeCompare", () => {
    it("returns true for equal strings", () => {
      expect(safeCompare("hello", "hello")).toBe(true);
    });

    it("returns false for strings of different lengths", () => {
      expect(safeCompare("hello", "hello!")).toBe(false);
      expect(safeCompare("hello!", "hello")).toBe(false);
    });

    it("returns false for same-length different strings", () => {
      expect(safeCompare("hello", "world")).toBe(false);
    });

    it("handles empty strings of same length (0)", () => {
      expect(safeCompare("", "")).toBe(true);
    });

    it("handles unicode strings", () => {
      expect(safeCompare("\u4e16\u754c", "\u4e16\u754c")).toBe(true);
      expect(safeCompare("\u4e16\u754c", "\u4e16\u754d")).toBe(false);
    });
  });

  describe("getExpectedSignature", () => {
    it("returns a string prefixed with sha256=", () => {
      const sig = getExpectedSignature("secret", "body");
      expect(sig.startsWith("sha256=")).toBe(true);
    });

    it("returns a 71-char hex string after the prefix (64 hex chars)", () => {
      const sig = getExpectedSignature("secret", "body");
      expect(sig).toMatch(/^sha256=[0-9a-f]{64}$/);
    });

    it("returns different signatures for different bodies", () => {
      const sig1 = getExpectedSignature("secret", "body1");
      const sig2 = getExpectedSignature("secret", "body2");
      expect(sig1).not.toBe(sig2);
    });

    it("returns different signatures for different secrets", () => {
      const sig1 = getExpectedSignature("secret1", "body");
      const sig2 = getExpectedSignature("secret2", "body");
      expect(sig1).not.toBe(sig2);
    });

    it("handles empty body", () => {
      const sig = getExpectedSignature("secret", "");
      expect(sig.startsWith("sha256=")).toBe(true);
    });
  });

  describe("verifyGitHubSignature", () => {
    const secret = "webhook-secret";

    it("returns true for a correctly signed body", () => {
      const body = '{"action":"opened"}';
      const sig = getExpectedSignature(secret, body);
      expect(verifyGitHubSignature(body, sig, secret)).toBe(true);
    });

    it("returns false for a tampered body", () => {
      const body = '{"action":"opened"}';
      const tamperedBody = '{"action":"closed"}';
      const sig = getExpectedSignature(secret, body);
      expect(verifyGitHubSignature(tamperedBody, sig, secret)).toBe(false);
    });

    it("returns false for a wrong signature prefix", () => {
      const body = '{"action":"opened"}';
      expect(verifyGitHubSignature(body, "sha1=deadbeef", secret)).toBe(false);
    });

    it("returns false for a signature without sha256= prefix", () => {
      const body = '{"action":"opened"}';
      const sig = getExpectedSignature(secret, body).replace("sha256=", "");
      expect(verifyGitHubSignature(body, sig, secret)).toBe(false);
    });

    it("returns false for null signature", () => {
      const body = '{"action":"opened"}';
      expect(verifyGitHubSignature(body, null, secret)).toBe(false);
    });

    it("returns false for undefined signature", () => {
      const body = '{"action":"opened"}';
      expect(verifyGitHubSignature(body, undefined as unknown as string, secret)).toBe(false);
    });

    it("handles empty body", () => {
      const body = "";
      const sig = getExpectedSignature(secret, body);
      expect(verifyGitHubSignature(body, sig, secret)).toBe(true);
    });
  });
});
