import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

function getWeekNumber(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  const username = session?.githubLogin;
  if (!username || !session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "30";

    const daysLimit = parseInt(range, 10);
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - daysLimit);
    const sinceIso = sinceDate.toISOString().split("T")[0];

    const githubUrl = `https://api.github.com/search/issues?q=author:${username}+type:issue+created:>=${sinceIso}&per_page=100`;

    const res = await fetch(githubUrl, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
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

    return NextResponse.json({
      stats: {
        totalOpen,
        openedThisWeek,
        closedThisWeek,
        avgDaysToClose: closedWithDurationCount > 0 ? Math.round(totalClosedDays / closedWithDurationCount) : 0,
      },
      chartData,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load issue metrics" },
      { status: 502 }
    );
  }
}