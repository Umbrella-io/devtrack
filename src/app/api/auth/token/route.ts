import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  ACCESS_TOKEN_MAX_AGE,
  REFRESH_TOKEN_MAX_AGE,
  USE_SECURE_COOKIES,
  createAccessToken,
  createRefreshToken,
  getTokenCookieName,
} from "@/lib/auth-tokens";

/**
 * POST /api/auth/token
 * 
 * This endpoint allows users to exchange their existing NextAuth session 
 * for the parallel JWT authentication tokens. This is intended for 
 * setting up access for third-party tools, CLI, or mobile applications.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.githubId || !session.githubLogin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = createAccessToken({
    githubId: session.githubId,
    githubLogin: session.githubLogin,
  });

  const refreshToken = createRefreshToken({
    githubId: session.githubId,
    githubLogin: session.githubLogin,
  });

  const response = NextResponse.json({
    ok: true,
    message: "Tokens generated successfully",
    accessTokenExpiresIn: ACCESS_TOKEN_MAX_AGE,
  });

  response.cookies.set({
    name: getTokenCookieName("access"),
    value: accessToken,
    httpOnly: true,
    sameSite: "lax",
    secure: USE_SECURE_COOKIES,
    path: "/",
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });

  response.cookies.set({
    name: getTokenCookieName("refresh"),
    value: refreshToken,
    httpOnly: true,
    sameSite: "lax",
    secure: USE_SECURE_COOKIES,
    path: "/",
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });

  return response;
}
