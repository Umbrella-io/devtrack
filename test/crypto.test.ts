import { describe, it, expect, beforeEach } from "vitest";
import { encryptToken, decryptToken, safeCompare, getExpectedSignature, verifyGitHubSignature } from "../src/lib/crypto";
const TEST_KEY = "a".repeat(64);
describe("encryptToken / decryptToken", () => {
  beforeEach(() => { process.env.ENCRYPTION_KEY = TEST_KEY; });
  it("roundtrips a simple string", () => {
    const { encrypted, iv } = encryptToken("hello world");
    expect(typeof encrypted).toBe("string"); expect(typeof iv).toBe("string"); expect(iv.length).toBe(24);
    expect(decryptToken(encrypted, iv)).toBe("hello world");
  });
  it("roundtrips unicode string", () => {
    const { encrypted, iv } = encryptToken("hello, world! with emoji");
    expect(decryptToken(encrypted, iv)).toBe("hello, world! with emoji");
  });
  it("returns null for wrong iv length", () => { const { encrypted } = encryptToken("hello"); expect(decryptToken(encrypted, "a".repeat(20))).toBeNull(); });
  it("returns null for tampered ciphertext", () => { const { encrypted, iv } = encryptToken("hello"); expect(decryptToken(encrypted.slice(0,-2)+"ff", iv)).toBeNull(); });
  it("throws when ENCRYPTION_KEY is not set", () => { delete process.env.ENCRYPTION_KEY; expect(() => encryptToken("hello")).toThrow(); });
  it("throws when ENCRYPTION_KEY is invalid format", () => { process.env.ENCRYPTION_KEY = "short"; expect(() => encryptToken("hello")).toThrow(); });
  it("produces different ciphertexts for same plaintext (random IV)", () => {
    const { encrypted: e1, iv: iv1 } = encryptToken("hello");
    const { encrypted: e2, iv: iv2 } = encryptToken("hello");
    expect(e1).not.toBe(e2); expect(iv1).not.toBe(iv2);
  });
});
describe("safeCompare", () => {
  it("returns true for equal strings", () => { expect(safeCompare("hello","hello")).toBe(true); });
  it("returns false for different strings", () => { expect(safeCompare("hello","world")).toBe(false); });
  it("returns false for strings of different length", () => { expect(safeCompare("hello","hi")).toBe(false); });
  it("handles empty strings", () => { expect(safeCompare("","")).toBe(true); expect(safeCompare("","a")).toBe(false); });
  it("returns boolean", () => { expect(typeof safeCompare("abc","abc")).toBe("boolean"); });
});
describe("getExpectedSignature", () => {
  it("returns sha256=... format", () => { expect(getExpectedSignature("secret","body").startsWith("sha256=")).toBe(true); });
  it("produces consistent output for same inputs", () => { expect(getExpectedSignature("secret","body")).toBe(getExpectedSignature("secret","body")); });
  it("produces different output for different secrets", () => { expect(getExpectedSignature("secret1","body")).not.toBe(getExpectedSignature("secret2","body")); });
  it("produces different output for different bodies", () => { expect(getExpectedSignature("secret","body1")).not.toBe(getExpectedSignature("secret","body2")); });
});
describe("verifyGitHubSignature", () => {
  it("returns true for valid signature", () => {
    const body = '{"action":"opened"}'; const secret = "mywebhooksecret";
    expect(verifyGitHubSignature(body, getExpectedSignature(secret,body), secret)).toBe(true);
  });
  it("returns false for wrong secret", () => {
    const body = '{"action":"opened"}';
    expect(verifyGitHubSignature(body, getExpectedSignature("secret1",body), "secret2")).toBe(false);
  });
  it("returns false for tampered body", () => { expect(verifyGitHubSignature("tampered", getExpectedSignature("secret","original"), "secret")).toBe(false); });
  it("returns false for null signature", () => { expect(verifyGitHubSignature("body", null, "secret")).toBe(false); });
  it("returns false for signature without sha256= prefix", () => {
    const sig = getExpectedSignature("secret","body").replace("sha256=","");
    expect(verifyGitHubSignature("body", sig, "secret")).toBe(false);
  });
});
