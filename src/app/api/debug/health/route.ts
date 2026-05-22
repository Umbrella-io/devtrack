import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Debug endpoint to check database connectivity and user creation
 * Remove this endpoint in production
 */
export async function GET() {
  const health = {
    status: "checking",
    timestamp: new Date().toISOString(),
    checks: {} as Record<string, any>,
  };

  try {
    // Check 1: Supabase client initialization
    health.checks.supabaseClient = {
      status: "ok",
      message: "Client initialized",
    };

    // Check 2: Database connectivity
    try {
      const { data, error } = await supabaseAdmin.from("users").select("count").single();
      if (error) {
        health.checks.database = {
          status: "error",
          message: error.message,
          code: error.code,
        };
      } else {
        health.checks.database = {
          status: "ok",
          message: "Database connected",
        };
      }
    } catch (e) {
      health.checks.database = {
        status: "error",
        message: String(e),
      };
    }

    // Check 3: Authentication
    const session = await getServerSession(authOptions);
    if (session?.githubId) {
      health.checks.session = {
        status: "ok",
        githubId: session.githubId,
        githubLogin: session.githubLogin,
      };

      // Check 4: Lookup existing user
      try {
        const { data: user, error } = await supabaseAdmin
          .from("users")
          .select("id, github_id, github_login")
          .eq("github_id", session.githubId)
          .single();

        if (error?.code === "PGRST116") {
          health.checks.userLookup = {
            status: "not_found",
            message: "User does not exist (PGRST116)",
          };
        } else if (error) {
          health.checks.userLookup = {
            status: "error",
            message: error.message,
            code: error.code,
          };
        } else if (user) {
          health.checks.userLookup = {
            status: "found",
            userId: user.id,
            githubId: user.github_id,
            githubLogin: user.github_login,
          };
        }
      } catch (e) {
        health.checks.userLookup = {
          status: "error",
          message: String(e),
        };
      }
    } else {
      health.checks.session = {
        status: "not_authenticated",
        message: "No active session",
      };
    }

    health.status = "ok";
    return NextResponse.json(health);
  } catch (error) {
    health.status = "error";
    health.checks.fatal = {
      error: String(error),
      message: error instanceof Error ? error.message : "Unknown error",
    };
    return NextResponse.json(health, { status: 500 });
  }
}

