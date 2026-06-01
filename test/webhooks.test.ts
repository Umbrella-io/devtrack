import "./setup";
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isValidWebhookEvent,
  getAvailableEvents,
  generateSecretKey,
  encryptSecretKey,
  decryptSecretKey,
  signPayload,
} from "../src/lib/webhooks";

vi.mock("../src/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      contains: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn(),
    }),
  },
}));

vi.mock("../src/lib/crypto", () => ({
  encryptToken: vi.fn().mockReturnValue({ encrypted: "enc", iv: "iv" }),
  decryptToken: vi.fn().mockReturnValue("decrypted_secret"),
}));

vi.mock("../src/lib/ssrf-protection", () => ({
  isSafeUrl: vi.fn().mockResolvedValue(true),
}));

describe("Webhooks Module", () => {
  describe("isValidWebhookEvent", () => {
    it("should return true for valid events", () => {
      expect(isValidWebhookEvent("goal.completed")).toBe(true);
      expect(isValidWebhookEvent("goal.created")).toBe(true);
      expect(isValidWebhookEvent("streak.milestone")).toBe(true);
    });

    it("should return false for invalid events", () => {
      expect(isValidWebhookEvent("invalid.event")).toBe(false);
      expect(isValidWebhookEvent("")).toBe(false);
      expect(isValidWebhookEvent("random")).toBe(false);
    });
  });

  describe("getAvailableEvents", () => {
    it("should return all available webhook events", () => {
      const events = getAvailableEvents();
      expect(events).toContain("goal.completed");
      expect(events).toContain("goal.created");
      expect(events).toContain("streak.milestone");
      expect(events).toContain("daily.summary");
      expect(events).toContain("weekly.summary");
      expect(events).toContain("metrics.updated");
      expect(events.length).toBe(6);
    });

    it("should return all 6 events", () => {
      const events = getAvailableEvents();
      expect(events.length).toBe(6);
    });
  });

  describe("generateSecretKey", () => {
    it("should generate a 64-character hex string", () => {
      const key = generateSecretKey();
      expect(key).toHaveLength(64);
      expect(key).toMatch(/^[a-f0-9]+$/);
    });

    it("should generate unique keys each time", () => {
      const key1 = generateSecretKey();
      const key2 = generateSecretKey();
      expect(key1).not.toBe(key2);
    });
  });

  describe("encryptSecretKey", () => {
    it("should return encrypted key and iv", () => {
      const result = encryptSecretKey("my_secret");
      expect(result).toHaveProperty("encrypted");
      expect(result).toHaveProperty("iv");
    });
  });

  describe("decryptSecretKey", () => {
    it("should return decrypted secret", () => {
      const result = decryptSecretKey("encrypted", "iv");
      expect(result).toBe("decrypted_secret");
    });
  });

  describe("signPayload", () => {
    it("should return hex signature", () => {
      const signature = signPayload('{"test":"data"}', "secret");
      expect(signature).toMatch(/^[a-f0-9]+$/);
      expect(signature).toHaveLength(64);
    });

    it("should produce same signature for same payload and secret", () => {
      const sig1 = signPayload('{"test":"data"}', "secret");
      const sig2 = signPayload('{"test":"data"}', "secret");
      expect(sig1).toBe(sig2);
    });

    it("should produce different signatures for different payloads", () => {
      const sig1 = signPayload('{"test":"data1"}', "secret");
      const sig2 = signPayload('{"test":"data2"}', "secret");
      expect(sig1).not.toBe(sig2);
    });

    it("should produce different signatures for different secrets", () => {
      const sig1 = signPayload('{"test":"data"}', "secret1");
      const sig2 = signPayload('{"test":"data"}', "secret2");
      expect(sig1).not.toBe(sig2);
    });

    it("should handle empty payload", () => {
      const signature = signPayload("", "secret");
      expect(signature).toHaveLength(64);
    });
  });
});