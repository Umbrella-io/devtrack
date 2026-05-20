import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import {
  fetchCIForChatbot,
  fetchContributionsForChatbot,
  fetchIssuesForChatbot,
  fetchLanguagesForChatbot,
  fetchPRsForChatbot,
  fetchReposForChatbot,
  fetchStreakForChatbot,
  fetchWeeklySummaryForChatbot,
} from "@/lib/chatbot-metrics";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    const session = await getServerSession(authOptions);

    if (!session?.accessToken || !session.githubLogin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { error: "Message too long" },
        { status: 400 }
      );
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "AI service unavailable" },
        { status: 500 }
      );
    }

    const userId = session.githubId ?? session.githubLogin;

    const cacheContext = {
      bypass: false,
      userId,
    };

    const { data: previousChats, error: historyError } = await supabaseAdmin
      .from("chatbot_messages")
      .select("role,message")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);

    if (historyError) {
      console.error("Failed to load chat history:", historyError);
    }

    const chatHistory =
      previousChats
        ?.reverse()
        .map((chat) => ({
          role: chat.role === "bot" ? "assistant" : "user",
          content: chat.message,
        })) || [];

    const { error: userInsertError } = await supabaseAdmin
      .from("chatbot_messages")
      .insert({
        user_id: userId,
        role: "user",
        message,
      });

    if (userInsertError) {
      console.error("Failed to save user message:", userInsertError);
    }

    const contributions = await fetchContributionsForChatbot(
      session.accessToken,
      session.githubLogin,
      365,
      cacheContext
    );

    const repos = await fetchReposForChatbot(
      session.accessToken,
      session.githubLogin,
      365,
      cacheContext
    );

    const streak = await fetchStreakForChatbot(
      session.accessToken,
      session.githubLogin,
      cacheContext
    );

    const prs = await fetchPRsForChatbot(
      session.accessToken,
      cacheContext
    );

    const languages = await fetchLanguagesForChatbot(
      session.accessToken,
      session.githubLogin
    );

    const issues = await fetchIssuesForChatbot(
      session.accessToken
    );

    const ci = await fetchCIForChatbot(
      session.accessToken,
      session.githubLogin,
      cacheContext
    );

    const weeklySummary = await fetchWeeklySummaryForChatbot(
      session.accessToken,
      session.githubLogin
    );

    const dashboardContext = {
      user: {
        githubLogin: session.githubLogin,
      },
      contributions,
      streak,
      repos,
      prs,
      languages,
      issues,
      ci,
      weeklySummary,
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
- Use dashboard data as the primary source for analytics and metrics.
- You may also use recent conversation history for contextual follow-up questions.
- If the user previously mentioned information in chat history, reference it clearly as user-provided information.
- Distinguish between dashboard facts and conversational facts.
- If some dashboard data is unavailable or failed to load, clearly mention it.
- Repository and contribution data currently represents up to 365 days of data.
- Do NOT call 365-day data "all-time" unless explicitly available.

Conversation memory rules:
- When the user refers to "it", "that", "he", "she", "they", or similar follow-up references, infer the reference using recent chat history.
- Prefer conversational continuity over generic dashboard summaries for short follow-up questions.
- If the user previously mentioned a repository, person, project, or metric, use that context in later replies.
- If the information is not in chat history or dashboard data, clearly say it is not available.

Example:
User says: "My friend Rahul has 400 commits"
Later user asks: "How many more commits does Rahul have than me?"
Correct behavior:
- Use Rahul's 400 commits from chat history as user-provided information.
- Compare it against the logged-in user's dashboard commits.
- Mention that Rahul's commit count came from the conversation, not dashboard data.

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
        { error: "Failed to get AI response" },
        { status: groqResponse.status }
      );
    }

    const reply =
      data?.choices?.[0]?.message?.content || "No response generated.";

    const { error: botInsertError } = await supabaseAdmin
      .from("chatbot_messages")
      .insert({
        user_id: userId,
        role: "bot",
        message: reply,
      });

    if (botInsertError) {
      console.error("Failed to save bot message:", botInsertError);
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Chatbot route error:", error);

    return NextResponse.json(
      { error: "Something went wrong while processing chatbot request" },
      { status: 500 }
    );
  }
}