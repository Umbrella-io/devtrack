import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

async function getMetric(path: string, cookie: string) {
  try {
    const res = await fetch(`http://localhost:3000${path}`, {
      headers: {
        cookie,
      },
      cache: "no-store",
    });

    if (!res.ok) return null;

    return await res.json();
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "GROQ_API_KEY is missing" },
        { status: 500 }
      );
    }

    const userId = session.user.email || session.user.name || "unknown-user";
    const cookie = req.headers.get("cookie") || "";

    const { data: previousChats } = await supabaseAdmin
      .from("chatbot_messages")
      .select("role,message")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    const chatHistory =
      previousChats
        ?.reverse()
        .map((chat) => ({
          role: chat.role === "bot" ? "assistant" : "user",
          content: chat.message,
        })) || [];

    await supabaseAdmin.from("chatbot_messages").insert({
      user_id: userId,
      role: "user",
      message,
    });

    const [
      contributions,
      streak,
      repos,
      prs,
      weeklySummary,
      prBreakdown,
      languages,
      issues,
      repoHealth,
      ci,
    ] = await Promise.all([
      getMetric("/api/metrics/contributions?days=365", cookie),
      getMetric("/api/metrics/streak", cookie),
      getMetric("/api/metrics/repos?days=365", cookie),
      getMetric("/api/metrics/prs", cookie),
      getMetric("/api/metrics/weekly-summary", cookie),
      getMetric("/api/metrics/pr-breakdown", cookie),
      getMetric("/api/metrics/languages", cookie),
      getMetric("/api/metrics/issues", cookie),
      getMetric("/api/metrics/repo-health?days=365", cookie),
      getMetric("/api/metrics/ci", cookie),
    ]);

    const dashboardContext = {
      user: session.user,
      contributions,
      streak,
      repos,
      prs,
      weeklySummary,
      prBreakdown,
      languages,
      issues,
      repoHealth,
      ci,
    };

    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          temperature: 0.4,
          messages: [
            {
              role: "system",
              content: `
You are DevTrack AI Assistant.

You help users understand their own DevTrack dashboard.

Formatting rules:
- ALWAYS respond in valid markdown.
- NEVER return plain paragraph blocks for analytics.
- ALWAYS use numbered lists or bullet lists for repositories, commits, PRs, rankings, and metrics.
- ALWAYS use headings for sections.
- ALWAYS use **bold** formatting for repository names and important metrics.
- Keep responses concise and developer-focused.
- NEVER dump raw JSON.
- Separate sections with spacing.

Repository ranking responses MUST follow this format exactly:

## Top Repositories

1. **Repository Name** → X commits
2. **Repository Name** → X commits
3. **Repository Name** → X commits

Insight responses MUST follow this format:

## Insights

- Insight 1
- Insight 2
- Insight 3

Recommendation responses MUST follow this format:

## Recommendations

- Recommendation 1
- Recommendation 2
- Recommendation 3

Data rules:
- ONLY answer using this logged-in user's dashboard data.
- If some data is unavailable or failed to load, clearly mention it.
- Repository and contribution data currently represents up to 365 days of data.
- Do NOT call 365-day data "all-time" unless explicitly available.
- Use recent chat history only for conversational context, not as a replacement for dashboard data.

Dashboard data:
${JSON.stringify(dashboardContext)}
`,
            },
            ...chatHistory,
            {
              role: "user",
              content: message,
            },
          ],
        }),
      }
    );

    const data = await groqResponse.json();

    if (!groqResponse.ok) {
      return NextResponse.json(
        {
          error: data?.error?.message || "Failed to get Groq response",
        },
        { status: groqResponse.status }
      );
    }

    const reply =
      data?.choices?.[0]?.message?.content || "No response generated.";

    await supabaseAdmin.from("chatbot_messages").insert({
      user_id: userId,
      role: "bot",
      message: reply,
    });

    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json(
      {
        error: "Something went wrong while processing chatbot request",
      },
      { status: 500 }
    );
  }
}