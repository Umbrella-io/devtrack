import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

console.log(`[auth-diag] ID=${!!process.env.GITHUB_ID} SECRET=${!!process.env.GITHUB_SECRET} NXSECRET=${!!process.env.NEXTAUTH_SECRET} NXURL=${process.env.NEXTAUTH_URL ?? "MISSING"}`);

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
