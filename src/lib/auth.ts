import { type NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import { supabaseAdmin } from "./supabase";

const SESSION_MAX_AGE = 30 * 24 * 60 * 60;
const SESSION_UPDATE_AGE = 24 * 60 * 60;

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID ?? "",
      clientSecret: process.env.GITHUB_SECRET ?? "",

      authorization: {
        params: {
          scope: "read:user user:email",
        },
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
      try {
        if (account?.provider === "github" && profile) {
          const p = profile as {
            id: number;
            login: string;
          };

          const { data, error } = await supabaseAdmin
            .from("users")
            .upsert(
              {
                github_id: String(p.id),
                github_login: p.login,
                updated_at: new Date().toISOString(),
              },
              {
                onConflict: "github_id",
              }
            );

          console.log("Supabase response:", data);

          if (error) {
            console.error("Supabase error:", error);
            return false;
          }

          console.log("GitHub sign in success");
        }

        return true;
      } catch (err) {
        console.error("SignIn callback failed:", err);
        return false;
      }
    },

    async jwt({ token, account, profile }) {
      try {
        if (account?.access_token) {
          token.accessToken = account.access_token;
        }

        if (profile) {
          const p = profile as {
            id: number;
            login: string;
          };

          token.githubId = String(p.id);
          token.githubLogin = p.login;
        }

        return token;
      } catch (err) {
        console.error("JWT callback failed:", err);
        return token;
      }
    },

    async session({ session, token }) {
      try {
        if (typeof token.accessToken === "string") {
          session.accessToken = token.accessToken;
        }

        if (typeof token.githubId === "string") {
          session.githubId = token.githubId;
        }

        if (typeof token.githubLogin === "string") {
          session.githubLogin = token.githubLogin;
        }

        return session;
      } catch (err) {
        console.error("Session callback failed:", err);
        return session;
      }
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};