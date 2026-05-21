import { encryptToken, decryptToken } from './crypto';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('encryptToken', () => {
  it('should encrypt and decrypt a token successfully', () => {
    const token = 'test-token-12345';
    const { encrypted, iv } = encryptToken(token);
    const decrypted = decryptToken(encrypted, iv);
    assert.strictEqual(decrypted, token);
  });

  it('should return different ciphertext for same input due to random IV', () => {
    const token = 'test-token';
    const result1 = encryptToken(token);
    const result2 = encryptToken(token);
    assert.notStrictEqual(result1.encrypted, result2.encrypted);
    assert.notStrictEqual(result1.iv, result2.iv);
  });
});

describe('decryptToken', () => {
  it('should throw on invalid hex input with odd length', () => {
    const { encrypted, iv } = encryptToken('test');
    const invalidEncrypted = encrypted.slice(0, -1);
    const result = decryptToken(invalidEncrypted, iv);
    assert.strictEqual(result, null);
  });

  it('should throw on invalid hex input with non-hex characters', () => {
    const { encrypted, iv } = encryptToken('test');
    const invalidEncrypted = encrypted.replace('a', 'x');
    const result = decryptToken(invalidEncrypted, iv);
    assert.strictEqual(result, null);
  });

  it('should throw on invalid IV length', () => {
    const { encrypted } = encryptToken('test');
    const invalidIv = '0'.repeat(20);
    const result = decryptToken(encrypted, invalidIv);
    assert.strictEqual(result, null);
  });

  it('should throw on encrypted token that is too short', () => {
    const { iv } = encryptToken('test');
    const result = decryptToken('aabbcc', iv);
    assert.strictEqual(result, null);
  });
});