import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import {
  analyzePatterns,
  computeTrends,
  DeveloperMetrics,
} from "@/lib/ai-mentor";

export const dynamic = "force-dynamic";

interface ContributionsApiResponse {
  data?: Record<string, number>;
  total?: number;
  days?: number;
}

interface PRsApiResponse {
  open?: number;
  merged?: number;
  avgReviewHours?: number;
}

interface StreakApiResponse {
  current?: number;
  longest?: number;
  totalActiveDays?: number;
}

interface RepoSummary {
  name: string;
  commits: number;
}

interface ReposApiResponse {
  repos?: RepoSummary[];
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.githubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.githubId;
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "weekly_summary";

  const { data: cached } = await supabaseAdmin
    .from("ai_insights")
    .select("*")
    .eq("user_id", userId)
    .eq("insight_type", type)
    .gte("expires_at", new Date().toISOString())
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cached) {
    return NextResponse.json({ data: cached.content, cached: true });
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const cookie = request.headers.get("cookie") ?? "";
  const headers = { Cookie: cookie };

  const [contributionsRes, prsRes, streakRes, reposRes] = await Promise.all([
    fetch(`${baseUrl}/api/metrics/contributions?days=90`, {
      headers,
      cache: "no-store",
    }),
    fetch(`${baseUrl}/api/metrics/prs`, { headers, cache: "no-store" }),
    fetch(`${baseUrl}/api/metrics/streak`, { headers, cache: "no-store" }),
    fetch(`${baseUrl}/api/metrics/repos?days=90`, {
      headers,
      cache: "no-store",
    }),
  ]);

  const [contributionsRaw, prsRaw, streakRaw, reposRaw]: [
    ContributionsApiResponse,
    PRsApiResponse,
    StreakApiResponse,
    ReposApiResponse,
  ] = await Promise.all([
    contributionsRes.ok ? contributionsRes.json() : {},
    prsRes.ok ? prsRes.json() : {},
    streakRes.ok ? streakRes.json() : {},
    reposRes.ok ? reposRes.json() : {},
  ]);

  const commitsByDay: Record<string, number> = contributionsRaw.data ?? {};
  const commitsArray = Object.entries(commitsByDay)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const metrics: DeveloperMetrics = {
    commits: commitsArray,
    prs: {
      merged: prsRaw.merged ?? 0,
      open: prsRaw.open ?? 0,
      avgMergeTimeDays: (prsRaw.avgReviewHours ?? 0) / 24,
    },
    streak: {
      current: streakRaw.current ?? 0,
      longest: streakRaw.longest ?? 0,
      activeDays: streakRaw.totalActiveDays ?? 0,
    },
    repos: (reposRaw.repos ?? []).map((r) => ({
      name: r.name,
      commits: r.commits,
    })),
  };

  const insights = analyzePatterns(metrics);
  const trend = computeTrends(metrics);

  let aiSummary: string | null = null;

  if (type === "weekly_summary" && process.env.GROQ_API_KEY) {
    try {
      const topRepoName = metrics.repos[0]?.name ?? "unknown";
      const totalCommits = metrics.commits.reduce((s, d) => s + d.count, 0);
      const trendLabel =
        trend.direction === "up"
          ? `+${trend.percentage}%`
          : `-${trend.percentage}%`;

      const prompt = `You are a senior engineering mentor reviewing a developer's GitHub activity from the past week.

Here is their data:
- Active coding days: ${metrics.streak.activeDays}
- Current streak: ${metrics.streak.current} days
- Total commits (90d): ${totalCommits}
- PRs merged: ${metrics.prs.merged}, open: ${metrics.prs.open}
- Avg PR merge time: ${metrics.prs.avgMergeTimeDays.toFixed(1)} days
- Top repository: ${topRepoName}
- Activity trend: ${trendLabel} vs prior period

Write a warm, concise 3-sentence weekly summary. Start with a highlight, add one observation, end with one actionable tip. Address the developer as "you". No bullet points.`;

      const groqRes = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            max_tokens: 300,
            messages: [{ role: "user", content: prompt }],
          }),
        }
      );

      if (groqRes.ok) {
        const groqData = (await groqRes.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        aiSummary = groqData.choices?.[0]?.message?.content ?? null;
      } else {
        console.error("Groq API error", groqRes.status, await groqRes.text());
      }
    } catch (err) {
      console.error("Groq API error — falling back to rule-based summary", err);
    }
  }

  const payload = {
    insights,
    trend,
    aiSummary,
    generatedAt: new Date().toISOString(),
  };

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  await supabaseAdmin.from("ai_insights").upsert(
    {
      user_id: userId,
      insight_type: type,
      content: payload,
      generated_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    },
    { onConflict: "user_id,insight_type" }
  );

  return NextResponse.json({ data: payload, cached: false });
}
