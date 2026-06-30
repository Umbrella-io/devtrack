import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { decryptTokenEdge } from "@/lib/crypto-edge";

const VALID_64HEX_KEY = "a".repeat(64); // 32 bytes of 0xAA
const VALID_24HEX_IV = "b".repeat(24); // 12 bytes of 0xBB

// Helper: round-trip encrypt + decrypt using Web Crypto API
async function encryptAndGetHex(plaintext: string, keyHex: string): Promise<{ encrypted: string; iv: string }> {
  const keyBytes = Uint8Array.from(atob(keyHex.slice(0, 64)), (_, i) => keyHex.charCodeAt(i * 2) * 16 + keyHex.charCodeAt(i * 2 + 1));
  // Actually, let's just generate a random key and IV
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    Uint8Array.from({ length: 32 }, (_, i) => i * 17),
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    new TextEncoder().encode(plaintext)
  );
  const encryptedHex = Buffer.from(encrypted).toString("hex");
  const ivHex = Buffer.from(iv).toString("hex");
  return { encrypted: encryptedHex, iv: ivHex };
}

describe("crypto-edge", () => {
  beforeEach(() => {
    vi.stubGlobal("crypto", globalThis.crypto);
  });

  describe("decryptTokenEdge", () => {
    it("returns null when ENCRYPTION_KEY env var is not set", async () => {
      const original = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;
      try {
        const result = await decryptTokenEdge("abc123", "a".repeat(24));
        expect(result).toBeNull();
      } finally {
        if (original !== undefined) process.env.ENCRYPTION_KEY = original;
      }
    });

    it("returns null when ENCRYPTION_KEY is too short", async () => {
      process.env.ENCRYPTION_KEY = "abc123";
      try {
        const result = await decryptTokenEdge("abc123", "a".repeat(24));
        expect(result).toBeNull();
      } finally {
        delete process.env.ENCRYPTION_KEY;
      }
    });

    it("returns null when ENCRYPTION_KEY is not a valid hex string", async () => {
      process.env.ENCRYPTION_KEY = "g".repeat(64); // 'g' is not a valid hex char
      try {
        const result = await decryptTokenEdge("abc123", "a".repeat(24));
        expect(result).toBeNull();
      } finally {
        delete process.env.ENCRYPTION_KEY;
      }
    });

    it("returns null when encrypted string contains non-hex characters", async () => {
      process.env.ENCRYPTION_KEY = VALID_64HEX_KEY;
      try {
        const result = await decryptTokenEdge("g".repeat(32), VALID_24HEX_IV);
        expect(result).toBeNull();
      } finally {
        delete process.env.ENCRYPTION_KEY;
      }
    });

    it("returns null when encrypted string length is odd", async () => {
      process.env.ENCRYPTION_KEY = VALID_64HEX_KEY;
      try {
        const result = await decryptTokenEdge("a".repeat(31), VALID_24HEX_IV);
        expect(result).toBeNull();
      } finally {
        delete process.env.ENCRYPTION_KEY;
      }
    });

    it("returns null when iv is not exactly 24 hex chars", async () => {
      process.env.ENCRYPTION_KEY = VALID_64HEX_KEY;
      try {
        // 23 chars - too short
        const result = await decryptTokenEdge("a".repeat(32), "a".repeat(23));
        expect(result).toBeNull();
      } finally {
        delete process.env.ENCRYPTION_KEY;
      }
    });

    it("returns null when iv contains non-hex characters", async () => {
      process.env.ENCRYPTION_KEY = VALID_64HEX_KEY;
      try {
        const result = await decryptTokenEdge("a".repeat(32), "g".repeat(24));
        expect(result).toBeNull();
      } finally {
        delete process.env.ENCRYPTION_KEY;
      }
    });

    it("round-trip: encrypt then decrypt returns original plaintext", async () => {
      // Use a deterministic key for the round-trip test
      const testKey = Buffer.from("test-encryption-key-32-bytes!").toString("hex").slice(0, 64);
      // Pad to 64 chars
      const paddedKey = testKey.padEnd(64, "0");

      const plaintext = "github_token_abc123";
      const iv = Buffer.from(crypto.getRandomValues(new Uint8Array(12))).toString("hex");

      // Encrypt using the same key
      const keyBytes = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        const hexPair = paddedKey.slice(i * 2, i * 2 + 2);
        keyBytes[i] = parseInt(hexPair, 16);
      }
      const cryptoKey = await crypto.subtle.importKey(
        "raw", keyBytes, { name: "AES-GCM" }, false, ["encrypt"]
      );
      const encryptedBuffer = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: Buffer.from(iv, "hex") },
        cryptoKey,
        new TextEncoder().encode(plaintext)
      );
      const encryptedHex = Buffer.from(encryptedBuffer).toString("hex");

      process.env.ENCRYPTION_KEY = paddedKey;
      try {
        const decrypted = await decryptTokenEdge(encryptedHex, iv);
        expect(decrypted).toBe(plaintext);
      } finally {
        delete process.env.ENCRYPTION_KEY;
      }
    });
  });
});
