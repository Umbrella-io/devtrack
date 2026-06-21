import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  encryptToken,
  decryptToken,
  safeCompare,
  getExpectedSignature,
  verifyGitHubSignature,
} from "../src/lib/crypto";

const VALID_KEY = "0".repeat(64);

describe("encryptToken / decryptToken", () => {
  beforeEach(() => {
    process.env.ENCRYPTION_KEY = VALID_KEY;
  });

  afterEach(() => {
    delete process.env.ENCRYPTION_KEY;
  });

  it("encrypts and decrypts a string round-trip", () => {
    const { encrypted, iv } = encryptToken("hello world");
    expect(typeof encrypted).toBe("string");
    expect(typeof iv).toBe("string");
    expect(encrypted.length).toBeGreaterThan(0);
    expect(iv.length).toBe(24); // 12 bytes = 24 hex chars

    const decrypted = decryptToken(encrypted, iv);
    expect(decrypted).toBe("hello world");
  });

  it("encrypts different strings to different ciphertexts", () => {
    const { encrypted: e1 } = encryptToken("alice");
    const { encrypted: e2 } = encryptToken("bob");
    expect(e1).not.toBe(e2);
  });

  it("decryptToken returns null for invalid IV (wrong length)", () => {
    const { encrypted } = encryptToken("secret");
    expect(decryptToken(encrypted, "abc123")).toBeNull();
  });

  it("decryptToken returns null for invalid IV (non-hex)", () => {
    const { encrypted } = encryptToken("secret");
    expect(decryptToken(encrypted, "g".repeat(24))).toBeNull();
  });

  it("decryptToken returns null for tampered ciphertext", () => {
    const { encrypted, iv } = encryptToken("secret");
    // Flip one hex character to corrupt the ciphertext
    const corrupted = encrypted.slice(0, -1) + (encrypted.at(-1) === "0" ? "1" : "0");
    expect(decryptToken(corrupted, iv)).toBeNull();
  });

  it("decryptToken returns null for missing ENCRYPTION_KEY", () => {
    delete process.env.ENCRYPTION_KEY;
    expect(decryptToken("aabbcc", "dd")).toBeNull();
  });

  it("decryptToken returns null for wrong key", () => {
    const { encrypted, iv } = encryptToken("secret");
    process.env.ENCRYPTION_KEY = "f".repeat(64);
    expect(decryptToken(encrypted, iv)).toBeNull();
  });
});

describe("safeCompare", () => {
  it("returns true for identical strings", () => {
    expect(safeCompare("hello", "hello")).toBe(true);
  });

  it("returns false for strings of different length", () => {
    expect(safeCompare("hello", "hell")).toBe(false);
    expect(safeCompare("a", "abc")).toBe(false);
  });

  it("returns false for same-length different strings", () => {
    expect(safeCompare("hello", "hxllo")).toBe(false);
  });

  it("handles empty strings", () => {
    expect(safeCompare("", "")).toBe(true);
    expect(safeCompare("", "a")).toBe(false);
  });

  it("handles unicode strings", () => {
    expect(safeCompare("hello world", "hello world")).toBe(true);
    expect(safeCompare("hello world", "hello worlD")).toBe(false);
  });
});

describe("getExpectedSignature", () => {
  it("returns a sha256= prefixed hex string", () => {
    const sig = getExpectedSignature("secret", "body");
    expect(sig).toMatch(/^sha256=[0-9a-f]{64}$/);
  });

  it("is deterministic for same secret and body", () => {
    const sig1 = getExpectedSignature("secret", "body");
    const sig2 = getExpectedSignature("secret", "body");
    expect(sig1).toBe(sig2);
  });

  it("produces different signatures for different secrets", () => {
    const sig1 = getExpectedSignature("secret1", "body");
    const sig2 = getExpectedSignature("secret2", "body");
    expect(sig1).not.toBe(sig2);
  });

  it("produces different signatures for different bodies", () => {
    const sig1 = getExpectedSignature("secret", "body1");
    const sig2 = getExpectedSignature("secret", "body2");
    expect(sig1).not.toBe(sig2);
  });
});

describe("verifyGitHubSignature", () => {
  const secret = "webhook-secret";
  const body = '{"action":"push"}';

  it("returns true for a valid signature", () => {
    const sig = getExpectedSignature(secret, body);
    expect(verifyGitHubSignature(body, sig, secret)).toBe(true);
  });

  it("returns false for a null signature", () => {
    expect(verifyGitHubSignature(body, null, secret)).toBe(false);
  });

  it("returns false for an undefined signature", () => {
    expect(verifyGitHubSignature(body, undefined as unknown as string, secret)).toBe(false);
  });

  it("returns false for a signature without sha256= prefix", () => {
    const bad = "abc123";
    expect(verifyGitHubSignature(body, bad, secret)).toBe(false);
  });

  it("returns false for a wrong secret", () => {
    const sig = getExpectedSignature(secret, body);
    expect(verifyGitHubSignature(body, sig, "wrong-secret")).toBe(false);
  });

  it("returns false for a tampered body", () => {
    const sig = getExpectedSignature(secret, body);
    expect(verifyGitHubSignature('{"action":"delete"}', sig, secret)).toBe(false);
  });
});
