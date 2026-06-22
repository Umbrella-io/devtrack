import { decryptTokenEdge } from "../src/lib/crypto-edge";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("crypto-edge", () => {
  const originalEnv = process.env;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    
    vi.stubGlobal("crypto", {
      subtle: {
        importKey: vi.fn().mockResolvedValue({}),
        decrypt: vi.fn().mockResolvedValue(new Uint8Array([104, 101, 108, 108, 111]).buffer), // "hello"
      }
    });
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe("decryptTokenEdge", () => {
    const validKey = "a".repeat(64);
    const validEncrypted = "b".repeat(32);
    const validIv = "c".repeat(24);

    it("should return null if ENCRYPTION_KEY is missing", async () => {
      delete process.env.ENCRYPTION_KEY;
      const result = await decryptTokenEdge(validEncrypted, validIv);
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Token decryption on Edge failed:",
        "ENCRYPTION_KEY env var must be a 32-byte hex string"
      );
    });

    it("should return null if ENCRYPTION_KEY format is invalid (not 64 hex chars)", async () => {
      process.env.ENCRYPTION_KEY = "invalid_key";
      const result = await decryptTokenEdge(validEncrypted, validIv);
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Token decryption on Edge failed:",
        "ENCRYPTION_KEY env var must be a 32-byte hex string"
      );

      // Too short
      process.env.ENCRYPTION_KEY = "a".repeat(63);
      expect(await decryptTokenEdge(validEncrypted, validIv)).toBeNull();

      // Non-hex
      process.env.ENCRYPTION_KEY = "g".repeat(64);
      expect(await decryptTokenEdge(validEncrypted, validIv)).toBeNull();
    });

    it("should return null if encrypted string is invalid (non-hex or wrong length)", async () => {
      process.env.ENCRYPTION_KEY = validKey;

      // Odd length
      expect(await decryptTokenEdge("bbb", validIv)).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Token decryption on Edge failed:",
        "Invalid encrypted token hex string"
      );

      // Non-hex
      expect(await decryptTokenEdge("invalid-encrypted", validIv)).toBeNull();
    });

    it("should return null if IV is invalid (non-hex or not 24 chars)", async () => {
      process.env.ENCRYPTION_KEY = validKey;

      // Wrong length
      expect(await decryptTokenEdge(validEncrypted, "c".repeat(23))).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Token decryption on Edge failed:",
        "Encrypted token IV must be a 12-byte hex string"
      );

      // Non-hex
      expect(await decryptTokenEdge(validEncrypted, "invalid-iv-string-123456")).toBeNull();
    });

    it("should return null if globalThis.crypto.subtle throws an error", async () => {
      process.env.ENCRYPTION_KEY = validKey;
      globalThis.crypto.subtle.importKey = vi.fn().mockRejectedValue(new Error("SubtleCrypto error"));

      const result = await decryptTokenEdge(validEncrypted, validIv);
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Token decryption on Edge failed:",
        "SubtleCrypto error"
      );
    });

    it("should successfully decrypt valid inputs", async () => {
      process.env.ENCRYPTION_KEY = validKey;
      const result = await decryptTokenEdge(validEncrypted, validIv);
      
      expect(globalThis.crypto.subtle.importKey).toHaveBeenCalled();
      expect(globalThis.crypto.subtle.decrypt).toHaveBeenCalled();
      expect(result).toBe("hello"); // Decoded from [104, 101, 108, 108, 111]
    });
  });
});
