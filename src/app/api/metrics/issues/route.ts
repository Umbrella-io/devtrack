import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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

// Helper function to get week numbers for the frontend trend chart
function getWeekNumber(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.accessToken || !session.githubLogin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.error === "TokenRevoked") {
    return githubAuthErrorResponse();
  }

  // 1. Core multi-account parameters from main branch
  const accountId = request.nextUrl.searchParams.get("accountId");
  const bypass = isMetricsCacheBypassed(request);

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
  let githubUsername = session.githubLogin;

  // 2. Main branch multi-account routing safety checks
  if (targetAccountId && targetAccountId !== session.githubId) {
    if (!session.githubId || !userRow) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accountToken = await getAccountToken(userRow.id, targetAccountId);
    if (!accountToken) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }
    
    // Dynamically retrieve the correct account configuration
    const targetAccount = userRow.accounts?.find((acc: any) => acc.accountId === targetAccountId);
    if (targetAccount?.username) {
      githubUsername = targetAccount.username;
    }
    
    const { data: accountRow } = await supabaseAdmin
      .from("user_github_accounts")
      .select("github_login")
      .eq("user_id", userRow.id)
      .eq("github_id", targetAccountId)
      .single();

    if (!accountRow?.github_login) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    token = accountToken;
    userId = targetAccountId;
  }

  // 3. Cache setup utilizing targeted user metadata and excluded organizational parameters
  const key = metricsCacheKey(userId, "issues", {
    orgName: orgName || undefined,
    excludedOrgs: excludedOrgs.length > 0 ? excludedOrgs.join(",") : undefined,
  });

  // 4. Custom issue calculation workflow protected by the cache wrapper
  try {
    const metrics = await withMetricsCache(
      { bypass, key, ttlSeconds: METRICS_CACHE_TTL_SECONDS.issues },
      async () => {
        const { searchParams } = new URL(request.url);
        const range = searchParams.get("range") || "30";

        const daysLimit = parseInt(range, 10);
        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - daysLimit);
        const sinceIso = sinceDate.toISOString().split("T")[0];

        // Fetching metrics matching the precise targeted user identifier
        const githubUrl = `https://api.github.com/search/issues?q=author:${githubUsername}+type:issue+created:>=${sinceIso}&per_page=100`;

        const res = await fetch(githubUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (!res.ok) throw new Error("GitHub API error");
        const data = await res.json();
        const issues = data.items || [];

        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        let totalOpen = 0;
        let openedThisWeek = 0;
        let closedThisWeek = 0;
        let totalClosedDays = 0;
        let closedWithDurationCount = 0;

        const weeklyTrendMap = new Map<string, number>();
        for (let i = 11; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i * 7);
          weeklyTrendMap.set(`Wk ${getWeekNumber(d)}`, 0);
        }

        issues.forEach((issue: { state: string; created_at: string; closed_at: string | null }) => {
          const createdAt = new Date(issue.created_at);
          const closedAt = issue.closed_at ? new Date(issue.closed_at) : null;

          if (issue.state === "open") totalOpen++;
          if (createdAt.getTime() >= oneWeekAgo.getTime()) openedThisWeek++;
          
          if (closedAt) {
            if (closedAt.getTime() >= oneWeekAgo.getTime()) closedThisWeek++;
            const durationDays = (closedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
            totalClosedDays += durationDays;
            closedWithDurationCount++;
          }

          const weekLabel = `Wk ${getWeekNumber(createdAt)}`;
          if (weeklyTrendMap.has(weekLabel)) {
            weeklyTrendMap.set(weekLabel, (weeklyTrendMap.get(weekLabel) || 0) + 1);
          }
        });

        const chartData = Array.from(weeklyTrendMap.entries()).map(([week, count]) => ({
          week,
          issues: count,
        }));

        return {
          stats: {
            totalOpen,
            openedThisWeek,
            closedWithDurationCount > 0 ? Math.round(totalClosedDays / closedWithDurationCount) : 0,
          },
          chartData,
        };
      }
    );
    
    return NextResponse.json(metrics);
  } catch (error) {
    if (error instanceof GitHubAuthError) {
      return githubAuthErrorResponse();
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load issue metrics" },
      { status: 502 }
    );
  }
}