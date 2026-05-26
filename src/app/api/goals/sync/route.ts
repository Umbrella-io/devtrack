import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Admin from environment variables safely
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const GITHUB_API = "https://api.github.com";

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user session
    const session = await getServerSession(authOptions);
    if (!session || !session.accessToken || !session.githubLogin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch active commit goals for this user from Supabase
    const { data: commitGoals, error: fetchError } = await supabaseAdmin
      .from("goals")
      .select("*")
      .eq("user_id", session.userId)
      .eq("type", "commits");

    if (fetchError || !commitGoals) {
      return NextResponse.json({ error: "Failed to fetch goals" }, { status: 500 });
    }

    // Calculate dates for the current week range
    const today = new Date();
    const dayOfWeek = today.getDay();
    const startOfWeekDate = new Date(today);
    startOfWeekDate.setDate(today.getDate() - dayOfWeek);
    startOfWeekDate.setHours(0, 0, 0, 0);
    
    const endOfWeekDate = new Date(startOfWeekDate);
    endOfWeekDate.setDate(startOfWeekDate.getDate() + 6);
    endOfWeekDate.setHours(23, 59, 59, 999);

    const weekStart = startOfWeekDate.toISOString();
    const weekEnd = endOfWeekDate.toISOString();

    // ── 3. Sync each goal separately with paginated commit counting ───────────
    const now = new Date().toISOString();

    for (const goal of commitGoals) {
      let page = 1;
      let commitCount = 0;
      let hasMore = true;

      // Optional repository field (if present in DB)
      const repo =
        goal.repo ||
        goal.repository ||
        goal.repo_name ||
        null;

      while (hasMore) {
        const repoQualifier = repo ? `+repo:${repo}` : "";

        const ghRes = await fetch(
          `${GITHUB_API}/search/commits?q=author:${session.githubLogin}${repoQualifier}+author-date:${weekStart}..${weekEnd}&per_page=100&page=${page}`,
          {
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
              Accept: "application/vnd.github+json",
            },
            cache: "no-store",
          }
        );

        if (!ghRes.ok) {
          return NextResponse.json(
            { error: "GitHub API error" },
            { status: 502 }
          );
        }

        const ghData = (await ghRes.json()) as {
          items?: unknown[];
        };

        const items = ghData.items || [];

        commitCount += items.length;

        if (items.length < 100) {
          hasMore = false;
        } else {
          page++;
        }
      }

      const { error: updateError } = await supabaseAdmin
        .from("goals")
        .update({
          current: commitCount,
          last_synced_at: now,
        })
        .eq("id", goal.id);

      if (updateError) {
        return NextResponse.json(
          { error: "Failed to update goals" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      updated: commitGoals.length,
    });

  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
