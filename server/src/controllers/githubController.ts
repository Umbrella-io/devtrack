import { Request, Response } from "express";
import jwt from "jsonwebtoken";

const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";

function getGithubRedirectUri(req: Request): string {
  return (
    process.env.GITHUB_REDIRECT_URI ??
    `${req.protocol}://${req.get("host")}/api/v1/auth/github/callback`
  );
}

export function githubSignIn(req: Request, res: Response): void {
  if (!process.env.GITHUB_CLIENT_ID) {
    res.status(500).json({ error: "Missing GITHUB_CLIENT_ID" });
    return;
  }

  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: getGithubRedirectUri(req),
    scope: process.env.GITHUB_OAUTH_SCOPES ?? "read:user user:email repo",
  });

  res.redirect(`${GITHUB_AUTHORIZE_URL}?${params.toString()}`);
}

export async function githubCallback(req: Request, res: Response): Promise<void> {
  const { code } = req.query;

  if (!code || typeof code !== "string") {
    res.status(400).json({ error: "Missing OAuth code" });
    return;
  }

  try {
    // Exchange code for GitHub access token
    const tokenRes = await fetch(GITHUB_TOKEN_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: getGithubRedirectUri(req),
      }),
    });

    const tokenData = (await tokenRes.json()) as { access_token?: string; error?: string };

    if (!tokenData.access_token) {
      res.status(401).json({ error: "GitHub OAuth failed", detail: tokenData.error });
      return;
    }

    // Fetch GitHub user info
    const userRes = await fetch(GITHUB_USER_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const user = (await userRes.json()) as { id: number; login: string };

    // Issue a JWT containing the GitHub token so downstream requests can call GitHub API
    const jwtToken = jwt.sign(
      { userId: String(user.id), githubLogin: user.login, githubToken: tokenData.access_token },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    const clientUrl = process.env.CLIENT_URL ?? "http://localhost:3000";
    res.redirect(`${clientUrl}/dashboard#token=${encodeURIComponent(jwtToken)}`);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
}
