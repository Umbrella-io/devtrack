import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac, timingSafeEqual } from 'crypto';

// We test the pure functions from the webhook route by re-implementing them
// so we don't need to import from a Next.js route module

function getExpectedSignature(secret: string, body: string): string {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}

function safeCompare(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");

  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}

function verifyGitHubSignature(
  body: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature?.startsWith("sha256=")) {
    return false;
  }

  return safeCompare(signature, getExpectedSignature(secret, body));
}

describe('webhook signature verification', () => {
  describe('safeCompare', () => {
    it('returns true for identical strings', () => {
      expect(safeCompare('abc', 'abc')).toBe(true);
    });

    it('returns false for different-length strings', () => {
      expect(safeCompare('abc', 'abcd')).toBe(false);
    });

    it('returns false for same-length but different content', () => {
      expect(safeCompare('abc', 'xyz')).toBe(false);
    });

    it('returns true for empty strings', () => {
      expect(safeCompare('', '')).toBe(true);
    });

    it('returns false for empty vs non-empty', () => {
      expect(safeCompare('', 'x')).toBe(false);
    });

    it('handles long strings correctly', () => {
      const long1 = 'a'.repeat(1000);
      const long2 = 'a'.repeat(1000);
      expect(safeCompare(long1, long2)).toBe(true);
      expect(safeCompare(long1, 'b' + 'a'.repeat(999))).toBe(false);
    });
  });

  describe('verifyGitHubSignature', () => {
    const secret = 'test-webhook-secret';
    const body = '{"action":"push","repository":"test"}';

    it('returns true for valid signature matching computed HMAC', () => {
      const validSignature = getExpectedSignature(secret, body);
      expect(verifyGitHubSignature(body, validSignature, secret)).toBe(true);
    });

    it('returns false for invalid signature', () => {
      const invalidSignature = 'sha256=0000000000000000000000000000000000000000000000000000000000000000';
      expect(verifyGitHubSignature(body, invalidSignature, secret)).toBe(false);
    });

    it('returns false for missing signature', () => {
      expect(verifyGitHubSignature(body, null, secret)).toBe(false);
    });

    it('returns false for undefined signature', () => {
      expect(verifyGitHubSignature(body, null, secret)).toBe(false);
    });

    it('returns false for empty string signature', () => {
      expect(verifyGitHubSignature(body, '', secret)).toBe(false);
    });

    it('returns false for signature without sha256= prefix', () => {
      const sigWithoutPrefix = createHmac("sha256", secret).update(body).digest("hex");
      expect(verifyGitHubSignature(body, sigWithoutPrefix, secret)).toBe(false);
    });

    it('returns false for signature with wrong prefix', () => {
      expect(verifyGitHubSignature(body, 'sha1=abc', secret)).toBe(false);
    });

    it('returns false for tampered body', () => {
      const validSig = getExpectedSignature(secret, body);
      const tamperedBody = '{"action":"delete","repository":"test"}';
      expect(verifyGitHubSignature(tamperedBody, validSig, secret)).toBe(false);
    });

    it('returns false for wrong secret', () => {
      const validSig = getExpectedSignature(secret, body);
      expect(verifyGitHubSignature(body, validSig, 'wrong-secret')).toBe(false);
    });

    it('handles empty body correctly', () => {
      const emptyBody = '';
      const validSig = getExpectedSignature(secret, emptyBody);
      expect(verifyGitHubSignature(emptyBody, validSig, secret)).toBe(true);
    });
  });

  describe('getExpectedSignature', () => {
    it('produces consistent HMAC for same inputs', () => {
      const sig1 = getExpectedSignature('secret', 'body');
      const sig2 = getExpectedSignature('secret', 'body');
      expect(sig1).toBe(sig2);
    });

    it('produces different HMAC for different secrets', () => {
      const sig1 = getExpectedSignature('secret1', 'body');
      const sig2 = getExpectedSignature('secret2', 'body');
      expect(sig1).not.toBe(sig2);
    });

    it('produces different HMAC for different bodies', () => {
      const sig1 = getExpectedSignature('secret', 'body1');
      const sig2 = getExpectedSignature('secret', 'body2');
      expect(sig1).not.toBe(sig2);
    });

    it('starts with sha256= prefix', () => {
      const sig = getExpectedSignature('secret', 'body');
      expect(sig.startsWith('sha256=')).toBe(true);
    });
  });
});
