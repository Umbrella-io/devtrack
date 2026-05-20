import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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

    const cookie = req.headers.get("cookie") || "";

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
          messages: [
            {
              role: "system",
              content: `You are DevTrack AI Assistant.

You help users understand their own DevTrack dashboard.

Only answer using this logged-in user's dashboard data.
If some data is null, unavailable, or failed to load, say that clearly.

Dashboard data:
${JSON.stringify(dashboardContext)}`,
            },
            {
              role: "user",
              content: message,
            },
          ],
          temperature: 0.4,
        }),
      }
    );

    const data = await groqResponse.json();

    if (!groqResponse.ok) {
      return NextResponse.json(
        { error: data?.error?.message || "Failed to get Groq response" },
        { status: groqResponse.status }
      );
    }

    return NextResponse.json({
      reply: data?.choices?.[0]?.message?.content || "No response generated.",
    });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong while processing chatbot request" },
      { status: 500 }
    );
  }
}