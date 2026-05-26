import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    // accessToken is deliberately absent — it lives only in the server-side
    // JWT (httpOnly cookie). Use getGitHubAccessToken(req) in API routes.
    githubId?: string;
    githubLogin?: string;
    gitlabToken?: string;
    /** Set to "TokenRevoked" when the stored GitHub token has been revoked and the session must be invalidated. */
    error?: "TokenRevoked";
    user?: DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    githubId?: string;
    githubLogin?: string;
    gitlabToken?: string;
    /** Unix ms timestamp of the last successful GitHub token liveness check. */
    accessTokenValidatedAt?: number;
    /** Set to "TokenRevoked" when GitHub returns 401 for the stored access token. */
    error?: "TokenRevoked";
  }
}
