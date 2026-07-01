import { type NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import { syncGitHubAchievementsForUser } from "./github-achievements";
import { supabaseAdmin } from "./supabase";
import { wasTokenRevokedNow } from "./token-revocation-flag";

const SESSION_MAX_AGE = 30 * 24 * 60 * 60;
const SESSION_UPDATE_AGE = 24 * 60 * 60;
const isPlaywrightServer = process.env.PLAYWRIGHT_SERVER_MODE === "start";

const GITHUB_API = "https://api.github.com";
const TOKEN_VALIDATION_INTERVAL_MS = 24 * 60 * 60 * 1000;

export const authOptions: NextAuthOptions = {
  ...(isPlaywrightServer ? { useSecureCookies: false } : {}),
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID ?? "",
      clientSecret: process.env.GITHUB_SECRET ?? "",
      authorization: {
        params: { scope: "read:user user:email repo read:discussion read:org" },
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE,
    updateAge: SESSION_UPDATE_AGE,
  },
  jwt: {
    maxAge: SESSION_MAX_AGE,
  },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "github" && profile) {
        const p = profile as { id: number; login: string; email?: string };

        if (!supabaseAdmin) {
          console.warn(
            "signIn: supabaseAdmin is not configured; skipping DB upsert. " +
            "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local."
          );
          return true;
        }

        try {
          let { data: user, error: upsertError } = await supabaseAdmin
            .from("users")
            .upsert(
              {
                github_id: String(p.id),
                github_login: p.login,
                email: p.email || null,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "github_id" }
            )
            .select("id")
            .single();

          if (upsertError && (upsertError as { code?: string }).code === "42703") {
            const fallback = await supabaseAdmin
              .from("users")
              .upsert(
                {
                  github_id: String(p.id),
                  github_login: p.login,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "github_id" }
              )
              .select("id")
              .single();
            user = fallback.data;
            upsertError = fallback.error;
          }

          if (upsertError) {
            console.error("[auth] Supabase upsert error:", upsertError);
          }

          if (user?.id && account.access_token) {
            try {
              await syncGitHubAchievementsForUser({
                userId: user.id,
                githubLogin: p.login,
                token: account.access_token,
                force: true,
              });
            } catch (error) {
              console.error("[auth] GitHub achievements sync failed:", error);
            }
          }
        } catch (error) {
          console.error("[auth] signIn callback error (non-fatal):", error);
        }
      }
      return true;
    },
    async jwt({ token, account, profile, user }) {
      if (account?.access_token) {
        token.accessToken = account.access_token;
        token.accessTokenValidatedAt = Date.now();
        token.error = undefined;
      } else if (user && (user as any).accessToken) {
        token.accessToken = (user as any).accessToken;
        token.accessTokenValidatedAt = Date.now();
      }
      if (profile) {
        const p = profile as { id: number; login: string };
        token.githubId = String(p.id);
        token.githubLogin = p.login;
      } else if (user) {
        token.githubId = user.id;
        token.githubLogin = (user as any).login || "mock-user";
      }

      // Fast path: if a route just got a live 401 from GitHub for this user,
      // it marks a short-lived flag (see token-revocation-flag.ts). Checking
      // it here means the next session read reflects "TokenRevoked" right
      // away instead of waiting for the 24h periodic check below.
      if (
        !token.error &&
        typeof token.githubId === "string" &&
        (await wasTokenRevokedNow(token.githubId))
      ) {
        token.error = "TokenRevoked";
      }

      if (
        !account &&
        typeof token.accessToken === "string" &&
        typeof token.accessTokenValidatedAt === "number" &&
        !token.error &&
        Date.now() - token.accessTokenValidatedAt > TOKEN_VALIDATION_INTERVAL_MS
      ) {
        try {
          const res = await fetch(`${GITHUB_API}/user`, {
            headers: { Authorization: `Bearer ${token.accessToken}` },
            cache: "no-store",
          });
          if (res.status === 401) {
            token.error = "TokenRevoked";
          } else if (res.ok) {
            token.accessTokenValidatedAt = Date.now();
          }
        } catch (e) {
          // Network failures during validation are not treated as revocation.
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (typeof token.accessToken === "string")
        session.accessToken = token.accessToken;
      if (typeof token.githubId === "string")
        session.githubId = token.githubId;
      if (typeof token.githubLogin === "string")
        session.githubLogin = token.githubLogin;
      if (token.error === "TokenRevoked")
        session.error = "TokenRevoked";
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
