import { describe, it, expect, beforeEach } from "vitest";
const TEST_KEY = "a".repeat(64);
describe("decryptTokenEdge", () => {
  beforeEach(() => { process.env.ENCRYPTION_KEY = TEST_KEY; });
  it("returns null when ENCRYPTION_KEY is missing", async () => {
    delete process.env.ENCRYPTION_KEY;
    const { decryptTokenEdge } = await import("../src/lib/crypto-edge");
    expect(await decryptTokenEdge("deadbeef", "a".repeat(24))).toBeNull();
  });
  it("returns null when ENCRYPTION_KEY is invalid format", async () => {
    process.env.ENCRYPTION_KEY = "short";
    const { decryptTokenEdge } = await import("../src/lib/crypto-edge");
    expect(await decryptTokenEdge("deadbeef", "a".repeat(24))).toBeNull();
  });
  it("returns null for non-hex encrypted string", async () => {
    const { decryptTokenEdge } = await import("../src/lib/crypto-edge");
    expect(await decryptTokenEdge("not-hex!", "a".repeat(24))).toBeNull();
  });
  it("returns null for odd-length encrypted string", async () => {
    const { decryptTokenEdge } = await import("../src/lib/crypto-edge");
    expect(await decryptTokenEdge("deadbeef", "a".repeat(24))).toBeNull();
  });
  it("returns null for non-hex iv", async () => {
    const { decryptTokenEdge } = await import("../src/lib/crypto-edge");
    expect(await decryptTokenEdge("a".repeat(64), "not-hex!")).toBeNull();
  });
  it("returns null when iv is not 24 chars", async () => {
    const { decryptTokenEdge } = await import("../src/lib/crypto-edge");
    expect(await decryptTokenEdge("a".repeat(64), "a".repeat(20))).toBeNull();
  });
  it("returns null for tampered ciphertext", async () => {
    const { decryptTokenEdge } = await import("../src/lib/crypto-edge");
    const { encryptToken } = await import("../src/lib/crypto");
    const { encrypted, iv } = encryptToken("hello world");
    expect(await decryptTokenEdge(encrypted.slice(0,-2)+"ff", iv)).toBeNull();
  });
  it("returns null for hex with invalid characters", async () => {
    const { decryptTokenEdge } = await import("../src/lib/crypto-edge");
    expect(await decryptTokenEdge("g".repeat(64), "a".repeat(24))).toBeNull();
  });
});
