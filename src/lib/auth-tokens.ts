/**
 * Intended Use Case for this JWT System:
 * The primary DevTrack web application uses NextAuth (session cookies) for authentication.
 * This parallel JWT-based authentication system provides long-lived refresh tokens and 
 * short-lived access tokens specifically designed for external API clients, CLI tools, 
 * or mobile applications that cannot rely on browser-based NextAuth session mechanisms.
 */

import { createHmac, timingSafeEqual } from "crypto";

export const ACCESS_TOKEN_MAX_AGE = 15 * 60; // 15 minutes
export const REFRESH_TOKEN_MAX_AGE = 30 * 24 * 60 * 60; // 30 days
export const USE_SECURE_COOKIES = process.env.NODE_ENV === "production";

export type AccessTokenPayload = {
  type: "access";
  githubId: string;
  githubLogin: string;
  iat: number;
  exp: number;
};

export type RefreshTokenPayload = {
  type: "refresh";
  githubId: string;
  githubLogin: string;
  iat: number;
  exp: number;
};

function base64UrlEncode(value: Buffer | string) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(value: string) {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), "=");
  return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function createJwt<T extends object>(payload: T, secret: string): string {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(`${encodedHeader}.${encodedPayload}`, secret);
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function verifyJwt(token: string, secret: string) {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWT format");
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const expectedSignature = sign(`${encodedHeader}.${encodedPayload}`, secret);
  if (!cryptoTimingSafeEqual(signature, expectedSignature)) {
    throw new Error("Invalid JWT signature");
  }

  const payloadJson = base64UrlDecode(encodedPayload).toString("utf8");
  const payload = JSON.parse(payloadJson) as { exp?: number };

  if (typeof payload.exp !== "number" || payload.exp * 1000 < Date.now()) {
    throw new Error("JWT expired");
  }

  return payload;
}

function cryptoTimingSafeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a, "utf8");
  const bBuffer = Buffer.from(b, "utf8");
  if (aBuffer.length !== bBuffer.length) {
    return false;
  }
  return timingSafeEqual(aBuffer, bBuffer);
}

export function getAuthTokenSecret() {
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET or NEXTAUTH_SECRET is required for JWT authentication");
  }
  return secret;
}

export function getTokenCookieName(type: "access" | "refresh") {
  return `${USE_SECURE_COOKIES ? "__Secure-" : ""}devtrack-${type}-token`;
}

export function createAccessToken({
  githubId,
  githubLogin,
}: {
  githubId: string;
  githubLogin: string;
}) {
  const now = Math.floor(Date.now() / 1000);
  return createJwt<AccessTokenPayload>(
    {
      type: "access",
      githubId,
      githubLogin,
      iat: now,
      exp: now + ACCESS_TOKEN_MAX_AGE,
    },
    getAuthTokenSecret()
  );
}

export function createRefreshToken({
  githubId,
  githubLogin,
}: {
  githubId: string;
  githubLogin: string;
}) {
  const now = Math.floor(Date.now() / 1000);
  return createJwt<RefreshTokenPayload>(
    {
      type: "refresh",
      githubId,
      githubLogin,
      iat: now,
      exp: now + REFRESH_TOKEN_MAX_AGE,
    },
    getAuthTokenSecret()
  );
}

export function verifyAccessToken(token: string) {
  const payload = verifyJwt(token, getAuthTokenSecret()) as AccessTokenPayload;
  if (payload.type !== "access") {
    throw new Error("Invalid access token");
  }
  return payload;
}

export function verifyRefreshToken(token: string) {
  const payload = verifyJwt(token, getAuthTokenSecret()) as RefreshTokenPayload;
  if (payload.type !== "refresh") {
    throw new Error("Invalid refresh token");
  }
  return payload;
}
