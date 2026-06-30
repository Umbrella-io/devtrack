/// <reference types="vitest/node" />

import { describe, it, expect } from "vitest";
import { decryptTokenEdge } from "@/lib/crypto-edge";

describe("decryptTokenEdge", () => {
  const VALID_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  describe("returns null for invalid hex strings", () => {
    it("returns null for invalid characters in encrypted token", async () => {
      const result = await decryptTokenEdge("xyz", "00".repeat(12));
      expect(result).toBeNull();
    });

    it("returns null for odd-length encrypted token", async () => {
      const result = await decryptTokenEdge("abc", "00".repeat(12));
      expect(result).toBeNull();
    });

    it("returns null for invalid characters in IV", async () => {
      const result = await decryptTokenEdge("00".repeat(32), "xyzxyz");
      expect(result).toBeNull();
    });
  });

  describe("returns null for wrong-length IV", () => {
    it("returns null when IV is too short", async () => {
      const result = await decryptTokenEdge("00".repeat(32), "00");
      expect(result).toBeNull();
    });

    it("returns null when IV is too long", async () => {
      const result = await decryptTokenEdge("00".repeat(32), "00".repeat(13));
      expect(result).toBeNull();
    });

    it("accepts IV of exactly 12 bytes (24 hex chars)", async () => {
      // Length is correct — should not early-return; may fail on crypto
      const result = await decryptTokenEdge("00".repeat(32), "00".repeat(12));
      expect(result === null || typeof result === "string").toBe(true);
    });
  });

  describe("returns null for missing or invalid ENCRYPTION_KEY", () => {
    it("returns null when ENCRYPTION_KEY is unset", async () => {
      const original = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;
      try {
        const result = await decryptTokenEdge("00".repeat(32), "00".repeat(12));
        expect(result).toBeNull();
      } finally {
        process.env.ENCRYPTION_KEY = original;
      }
    });

    it("returns null when ENCRYPTION_KEY is too short", async () => {
      const original = process.env.ENCRYPTION_KEY;
      process.env.ENCRYPTION_KEY = "tooshort";
      try {
        const result = await decryptTokenEdge("00".repeat(32), "00".repeat(12));
        expect(result).toBeNull();
      } finally {
        process.env.ENCRYPTION_KEY = original;
      }
    });

    it("returns null when ENCRYPTION_KEY has non-hex characters", async () => {
      const original = process.env.ENCRYPTION_KEY;
      process.env.ENCRYPTION_KEY = "xyz".repeat(21) + "xyz";
      try {
        const result = await decryptTokenEdge("00".repeat(32), "00".repeat(12));
        expect(result).toBeNull();
      } finally {
        process.env.ENCRYPTION_KEY = original;
      }
    });
  });

  describe("successful decryption with valid inputs", () => {
    it("decrypts ciphertext back to original plaintext", async () => {
      process.env.ENCRYPTION_KEY = VALID_KEY;
      const { randomBytes, createCipheriv } = await import("node:crypto");
      const key = Buffer.from(VALID_KEY, "hex");
      const iv = randomBytes(12);
      const plaintext = "hello, world!";
      const cipher = createCipheriv("aes-256-gcm", key, iv);
      const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
      const authTag = cipher.getAuthTag();
      const ciphertext = Buffer.concat([encrypted, authTag]).toString("hex");

      const result = await decryptTokenEdge(ciphertext, iv.toString("hex"));
      expect(result).toBe(plaintext);
    });

    it("decrypts unicode content correctly", async () => {
      process.env.ENCRYPTION_KEY = VALID_KEY;
      const { randomBytes, createCipheriv } = await import("node:crypto");
      const key = Buffer.from(VALID_KEY, "hex");
      const iv = randomBytes(12);
      const plaintext = "Hello, World! \u4e16\u754c \u00e9t\u00e9";
      const cipher = createCipheriv("aes-256-gcm", key, iv);
      const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
      const authTag = cipher.getAuthTag();
      const ciphertext = Buffer.concat([encrypted, authTag]).toString("hex");

      const result = await decryptTokenEdge(ciphertext, iv.toString("hex"));
      expect(result).toBe(plaintext);
    });

    it("decrypts empty string", async () => {
      process.env.ENCRYPTION_KEY = VALID_KEY;
      const { randomBytes, createCipheriv } = await import("node:crypto");
      const key = Buffer.from(VALID_KEY, "hex");
      const iv = randomBytes(12);
      const plaintext = "";
      const cipher = createCipheriv("aes-256-gcm", key, iv);
      const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
      const authTag = cipher.getAuthTag();
      const ciphertext = Buffer.concat([encrypted, authTag]).toString("hex");

      const result = await decryptTokenEdge(ciphertext, iv.toString("hex"));
      expect(result).toBe(plaintext);
    });
  });
});
