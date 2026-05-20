import { type NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import GitLabProvider from "next-auth/providers/gitlab";
import { supabaseAdmin } from "./supabase";

const SESSION_MAX_AGE = 30 * 24 * 60 * 60;
const SESSION_UPDATE_AGE = 24 * 60 * 60;
const useSecureCookies = process.env.NODE_ENV === "production";

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID ?? "",
      clientSecret: process.env.GITHUB_SECRET ?? "",
      authorization: {
        params: { scope: "read:user user:email repo read:discussion" },
      },
    }),
    GitLabProvider({
      clientId: process.env.GITLAB_ID ?? "",
      clientSecret: process.env.GITLAB_SECRET ?? "",
      authorization: {
        params: { scope: "read_user api" },
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
        const p = profile as { id: number; login: string };
        await supabaseAdmin.from("users").upsert(
          {
            github_id: String(p.id),
            github_login: p.login,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "github_id" }
        );
      }
      if (account?.provider === "gitlab" && profile) {
        const p = profile as { id: number; username: string };
        await supabaseAdmin.from("users").upsert(
          {
            gitlab_id: String(p.id),
            gitlab_login: p.username,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "gitlab_id" }
        );
      }
      return true;
    },
    async jwt({ token, account, profile }) {
      if (account?.provider === "github" && account.access_token)
        token.accessToken = account.access_token;
      if (account?.provider === "github" && profile) {
        const p = profile as { id: number; login: string };
        token.githubId = String(p.id);
        token.githubLogin = p.login;
      }
      if (account?.provider === "gitlab" && profile) {
        const p = profile as { id: number; username: string };
        token.gitlabToken = account.access_token;
        token.gitlabId = String(p.id);
        token.gitlabLogin = p.username;
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
      if (typeof token.gitlabToken === "string")
        session.gitlabToken = token.gitlabToken;
      if (typeof token.gitlabId === "string")
        session.gitlabId = token.gitlabId;
      if (typeof token.gitlabLogin === "string")
        session.gitlabLogin = token.gitlabLogin;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
