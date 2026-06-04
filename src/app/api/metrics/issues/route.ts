import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  isMetricsCacheBypassed,
  METRICS_CACHE_TTL_SECONDS,
  metricsCacheKey,
  withMetricsCache,
} from "@/lib/metrics-cache";
import { getAccountToken } from "@/lib/github-accounts";
import { resolveAppUser } from "@/lib/resolve-user";

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

  // 1. Core multi-account parameters from main branch
  const accountId = request.nextUrl.searchParams.get("accountId");
  const bypass = isMetricsCacheBypassed(request);

  let token = session.accessToken;
  let userId = session.githubId ?? session.githubLogin;
  let githubUsername = session.githubLogin; // Track the correct username for the API search string

  // 2. Main branch multi-account routing safety checks
  if (accountId && accountId !== session.githubId) {
    if (!session.githubId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userRow = await resolveAppUser(session.githubId, session.githubLogin);
    if (!userRow) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const accountToken = await getAccountToken(userRow.id, accountId);
    if (!accountToken) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }
    
    // Dynamically retrieve the correct account configuration
    const targetAccount = userRow.accounts?.find((acc: any) => acc.accountId === accountId);
    if (targetAccount?.username) {
      githubUsername = targetAccount.username;
    }
    
    token = accountToken;
    userId = accountId;
  }

  // 3. Keep custom metrics logic cache setup using the verified userId
  const key = metricsCacheKey(userId, "issues");

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

        // BUG FIX: Querying with githubUsername instead of hardcoded session profile configuration
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
            closedThisWeek,
            avgDaysToClose: closedWithDurationCount > 0 ? Math.round(totalClosedDays / closedWithDurationCount) : 0,
          },
          chartData,
        };
      }
    );
    
    return NextResponse.json(metrics);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load issue metrics" },
      { status: 502 }
    );
  }
}