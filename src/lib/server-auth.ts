import { getServerSession as originalGetServerSession } from "next-auth";
import { authOptions } from "./auth";
import { cookies } from "next/headers";
import { decode } from "next-auth/jwt";

export async function getServerAuthSession() {
  const session = await originalGetServerSession(authOptions);
  
  if (!session) {
    return null;
  }

  let accessToken: string | undefined = undefined;

  // Determine cookie name based on NextAuth logic for secure/unsecure contexts
  const cookieName = process.env.PLAYWRIGHT_SERVER_MODE === "start" 
    ? "next-auth.session-token" 
    : (process.env.NODE_ENV === "production" ? "__Secure-next-auth.session-token" : "next-auth.session-token");
    
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get(cookieName)?.value;

  if (tokenCookie) {
    try {
      const decoded = await decode({ 
        token: tokenCookie, 
        secret: process.env.NEXTAUTH_SECRET! 
      });
      if (decoded && typeof decoded.accessToken === "string") {
        accessToken = decoded.accessToken;
      }
    } catch (e) {
      console.error("[getServerAuthSession] Failed to decode session token", e);
    }
  }

  // Inject the token dynamically only for server-side usage
  return {
    ...session,
    accessToken
  };
}
