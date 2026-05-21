import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_ERROR_MESSAGE =
  "ENCRYPTION_KEY env var must be a 32-byte hex string";
const IV_ERROR_MESSAGE =
  "Encrypted token IV must be a 12-byte hex string";
const PAYLOAD_ERROR_MESSAGE =
  "Encrypted token payload must include at least a 16-byte auth tag";

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key || !/^[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error(KEY_ERROR_MESSAGE);
  }

  const keyBuffer = Buffer.from(key, "hex");

  if (keyBuffer.length !== 32) {
    throw new Error(KEY_ERROR_MESSAGE);
  }

  return keyBuffer;
}

function assertFixedHex(value: string, expectedChars: number, message: string) {
  if (!new RegExp(`^[0-9a-fA-F]{${expectedChars}}$`).test(value)) {
    throw new Error(message);
  }
}

function validateEncryptedTokenPayload(encrypted: string, iv: string) {
  assertFixedHex(iv, IV_LENGTH * 2, IV_ERROR_MESSAGE);

  if (
    encrypted.length < AUTH_TAG_LENGTH * 2 ||
    encrypted.length % 2 !== 0 ||
    !/^[0-9a-fA-F]+$/.test(encrypted)
  ) {
    throw new Error(PAYLOAD_ERROR_MESSAGE);
  }
}

export function encryptToken(plaintext: string): {
  encrypted: string;
  iv: string;
} {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return {
    encrypted: Buffer.concat([encrypted, authTag]).toString("hex"),
    iv: iv.toString("hex"),
  };
}

export function decryptToken(
  encrypted: string,
  iv: string
): string | null {
  try {
    const key = getEncryptionKey();
    validateEncryptedTokenPayload(encrypted, iv);
    const encryptedBuffer = Buffer.from(encrypted, "hex");
    const ivBuffer = Buffer.from(iv, "hex");

    if (ivBuffer.length !== IV_LENGTH) {
      throw new Error("Invalid IV length");
    }

    if (encryptedBuffer.length < AUTH_TAG_LENGTH + 1) {
      throw new Error("Encrypted token too short");
    }

    const ciphertext = encryptedBuffer.subarray(
      0,
      encryptedBuffer.length - AUTH_TAG_LENGTH
    );

    const authTag = encryptedBuffer.subarray(
      encryptedBuffer.length - AUTH_TAG_LENGTH
    );

    const decipher = createDecipheriv(ALGORITHM, key, ivBuffer);

    decipher.setAuthTag(authTag);

    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
  } catch (error) {
    console.error("Token decryption failed:", error);
    return null;
  }
}
