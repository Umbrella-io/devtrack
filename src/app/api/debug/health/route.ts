import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * Debug health endpoint — only enabled when ENABLE_DEBUG_ENDPOINT=true
 * Returns internal state for diagnostic purposes during development.
 * IMPORTANT: Do not enable in production.
 */
export async function GET() {
  // Guard: only serve if explicitly enabled via env var
  if (process.env.ENABLE_DEBUG_ENDPOINT !== "true") {
    return NextResponse.json(
      { error: "Debug endpoint is disabled" },
      { status: 403 }
    );
  }

  try {
    const session = await getServerSession(authOptions);

    // Basic connectivity check
    let dbHealthy = true;
    let dbError: string | null = null;

    try {
      const { error } = await supabaseAdmin
        .from("users")
        .select("id")
        .limit(1);

      if (error) {
        dbHealthy = false;
        dbError = error.message;
      }
    } catch (err) {
      dbHealthy = false;
      dbError = err instanceof Error ? err.message : String(err);
    }

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: {
        nextPublicSupabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? "set" : "missing",
        supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
          ? "set"
          : "missing",
        nextAuthSecret: process.env.NEXTAUTH_SECRET ? "set" : "missing",
        githubId: process.env.GITHUB_ID ? "set" : "missing",
        githubSecret: process.env.GITHUB_SECRET ? "set" : "missing",
      },
      database: {
        healthy: dbHealthy,
        error: dbError,
      },
      session: session
        ? {
            authenticated: true,
            githubId: session.githubId,
            githubLogin: session.githubLogin,
          }
        : {
            authenticated: false,
          },
    });
  } catch (error) {
    console.error("Error in debug health endpoint:", error);
    return NextResponse.json(
      { error: "Failed to generate debug report" },
      { status: 500 }
    );
  }
}
