import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

console.log("[auth-route] GITHUB_ID present:", !!process.env.GITHUB_ID);
console.log("[auth-route] GITHUB_SECRET present:", !!process.env.GITHUB_SECRET);
console.log("[auth-route] NEXTAUTH_SECRET present:", !!process.env.NEXTAUTH_SECRET);
console.log("[auth-route] NEXTAUTH_URL:", process.env.NEXTAUTH_URL);

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
