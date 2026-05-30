import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { weeklyProductivityPrompt } from "@/lib/ai-prompts";
import {
  analyzePatterns,
  computeTrends,
  DeveloperMetrics,
} from "@/lib/ai-mentor";
const aiInsightsRateLimit = new Map<
  string,
  { count: number; resetTime: number }
>();
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
  const currentTime = Date.now();
  const WINDOW_MS = 60 * 60 * 1000;
  const MAX_REQUESTS = 5;

  let existing = aiInsightsRateLimit.get(userId);
  if (!existing || currentTime > existing.resetTime) {
    existing = { count: 0, resetTime: currentTime + WINDOW_MS };
    aiInsightsRateLimit.set(userId, existing);
  }

  if (existing.count >= MAX_REQUESTS) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.ceil((existing.resetTime - currentTime) / 1000)
          ),
        },
      }
    );
  }
  existing.count += 1;
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

      const prompt = weeklyProductivityPrompt({
        activeDays: metrics.streak.activeDays,
        currentStreak: metrics.streak.current,
        totalCommits,
        prsMerged: metrics.prs.merged,
        prsOpen: metrics.prs.open,
        avgMergeTimeDays: metrics.prs.avgMergeTimeDays,
        topRepoName,
        trendLabel,
      });

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
