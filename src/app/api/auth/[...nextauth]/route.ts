import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";

console.log(`[auth-diag] ID=${!!process.env.GITHUB_ID} SECRET=${!!process.env.GITHUB_SECRET} NXSECRET=${!!process.env.NEXTAUTH_SECRET} NXURL=${process.env.NEXTAUTH_URL ?? "MISSING"}`);

const handler = NextAuth(authOptions);

async function wrappedHandler(req: NextRequest, ctx: { params: { nextauth: string[] } }) {
  try {
    const url = new URL(req.url);
    console.log(`[auth-req] ${req.method} ${url.pathname}${url.search}`);
    const res = await handler(req, ctx);
    console.log(`[auth-res] status=${res.status} location=${res.headers.get("location") ?? "none"}`);
    return res;
  } catch (err) {
    console.error("[auth-error]", String(err));
    throw err;
  }
}

export { wrappedHandler as GET, wrappedHandler as POST };
