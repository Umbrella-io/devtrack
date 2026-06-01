/**
 * Credential Encryption Utility
 *
 * AES-256-GCM encryption for sensitive credentials (Jira tokens, etc.)
 * Uses Node.js crypto module — server-side only.
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;    // 96-bit IV for GCM
const TAG_LENGTH = 16;   // 128-bit auth tag
const KEY_LENGTH = 32;   // 256-bit key

function deriveKey(secret: string): Buffer {
  const salt = process.env.ENCRYPTION_SALT || "devtrack-salt-v1";
  return scryptSync(secret, salt, KEY_LENGTH);
}

/**
 * Encrypt a plaintext credential string.
 *
 * @param plaintext - The credential to encrypt
 * @returns Base64-encoded string: iv:authTag:ciphertext
 */
export function encryptCredential(plaintext: string): string {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) throw new Error("ENCRYPTION_SECRET environment variable is not set");

  const key = deriveKey(secret);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

/**
 * Decrypt an encrypted credential string.
 *
 * @param encryptedData - Base64 string in iv:authTag:ciphertext format
 * @returns Decrypted plaintext credential
 */
export function decryptCredential(encryptedData: string): string {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) throw new Error("ENCRYPTION_SECRET environment variable is not set");

  const parts = encryptedData.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted credential format");

  const [ivB64, tagB64, dataB64] = parts;
  const key = deriveKey(secret);
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(tagB64, "base64");
  const encrypted = Buffer.from(dataB64, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return decipher.update(encrypted).toString("utf8") + decipher.final("utf8");
}
