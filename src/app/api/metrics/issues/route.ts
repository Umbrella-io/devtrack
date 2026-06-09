import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";
import { fetchIssuesMetrics } from "@/lib/github";
import { GitHubAuthError, githubAuthErrorResponse } from "@/lib/github-fetch";
import {
  isMetricsCacheBypassed,
  METRICS_CACHE_TTL_SECONDS,
  metricsCacheKey,
  withMetricsCache,
} from "@/lib/metrics-cache";
import { getAccountToken } from "@/lib/github-accounts";
import { resolveAppUser, type AppUser } from "@/lib/resolve-user";
import { supabaseAdmin } from "@/lib/supabase";
import { isSupabaseAdminAvailable } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken || !session.githubLogin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.error === "TokenRevoked") {
    return githubAuthErrorResponse();
  }

  const accountId = req.nextUrl.searchParams.get("accountId");
  const bypass = isMetricsCacheBypassed(req);

  let orgName: string | null = null;
  let targetAccountId: string | null = accountId;

  if (accountId && accountId.startsWith("org:")) {
    const parts = accountId.split(":");
    targetAccountId = parts[1];
    orgName = parts[2];
  }

  // Load excluded organizations config
  let excludedOrgs: string[] = [];
  let userRow: AppUser | null = null;
  if (isSupabaseAdminAvailable && session.githubId) {
    userRow = await resolveAppUser(session.githubId, session.githubLogin);
    if (userRow) {
      try {
        const { data: dbUser } = await supabaseAdmin
          .from("users")
          .select("organizations_config")
          .eq("id", userRow.id)
          .single();

        const orgsConfig = (dbUser?.organizations_config || {}) as Record<string, boolean>;
        excludedOrgs = Object.entries(orgsConfig)
          .filter(([_, enabled]) => enabled === false)
          .map(([org]) => org);
      } catch (err) {
        console.error("Failed to load excluded orgs config:", err);
      }
    }
  }

  let token = session.accessToken;
  let userId = session.githubId ?? session.githubLogin;
  let githubLogin = session.githubLogin;

  if (targetAccountId && targetAccountId !== session.githubId) {
    if (!session.githubId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!userRow) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const accountToken = await getAccountToken(userRow.id, targetAccountId);
    if (!accountToken) {
      return Response.json({ error: "Account not found" }, { status: 404 });
    }
    const { data: accountRow } = await supabaseAdmin
      .from("user_github_accounts")
      .select("github_login")
      .eq("user_id", userRow.id)
      .eq("github_id", targetAccountId)
      .single();

    if (!accountRow?.github_login) {
      return Response.json({ error: "Account not found" }, { status: 404 });
    }

    token = accountToken;
    userId = targetAccountId;
    githubLogin = accountRow.github_login;
  }

  const key = metricsCacheKey(userId, "issues", {
    orgName: orgName || undefined,
    excludedOrgs: excludedOrgs.length > 0 ? excludedOrgs.join(",") : undefined,
  });

  try {
    const metrics = await withMetricsCache(
      { bypass, key, ttlSeconds: METRICS_CACHE_TTL_SECONDS.issues },
      () => fetchIssuesMetrics(token!, githubLogin, orgName, excludedOrgs)
    );
    return Response.json(metrics);
  } catch (e) {
    if (e instanceof GitHubAuthError) return githubAuthErrorResponse();
    return Response.json({ error: "GitHub API error" }, { status: 502 });
  }
}
