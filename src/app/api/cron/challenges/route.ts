import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const GITHUB_API = "https://api.github.com";

async function fetchGithubMetric(login: string, metric: string, startTime: string, endTime: string, token?: string) {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let url = "";
  if (metric === "commits") {
    url = `${GITHUB_API}/search/commits?q=author:${login} author-date:${startTime}..${endTime}&per_page=1`;
  } else if (metric === "prs") {
    url = `${GITHUB_API}/search/issues?q=author:${login} type:pr is:merged merged:${startTime}..${endTime}&per_page=1`;
  } else {
    return 0;
  }

  try {
    const res = await fetch(url, { headers, cache: "no-store" });
    if (!res.ok) return 0;
    const data = await res.json() as { total_count?: number };
    return data.total_count || 0;
  } catch (err) {
    console.error("Failed to fetch metric for", login, err);
    return 0;
  }
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: challenges, error } = await supabaseAdmin
    .from("challenges")
    .select("*, creator:users!challenges_creator_id_fkey(github_login), opponent:users!challenges_opponent_id_fkey(github_login)")
    .eq("status", "active")
    .lt("end_time", new Date().toISOString());

  if (error || !challenges) {
    return NextResponse.json({ error: "Failed to fetch challenges" }, { status: 500 });
  }

  const githubToken = process.env.GITHUB_TOKEN;
  let processed = 0;

  for (const challenge of challenges) {
    const creatorLogin = challenge.creator?.github_login;
    const opponentLogin = challenge.opponent?.github_login;

    if (!creatorLogin || !opponentLogin) continue;

    const startStr = new Date(challenge.start_time).toISOString().split(".")[0] + "Z";
    const endStr = new Date(challenge.end_time).toISOString().split(".")[0] + "Z";

    const creatorScore = await fetchGithubMetric(creatorLogin, challenge.metric, startStr, endStr, githubToken);
    const opponentScore = await fetchGithubMetric(opponentLogin, challenge.metric, startStr, endStr, githubToken);

    let winner_id = null;
    if (creatorScore > opponentScore) {
      winner_id = challenge.creator_id;
    } else if (opponentScore > creatorScore) {
      winner_id = challenge.opponent_id;
    }

    await supabaseAdmin
      .from("challenges")
      .update({
        status: "completed",
        winner_id,
        creator_start_metrics: creatorScore, // using these fields to store final score
        opponent_start_metrics: opponentScore,
      })
      .eq("id", challenge.id);

    // Notifications
    const notifications = [
      {
        user_id: challenge.creator_id,
        type: "challenge_completed",
        message: `Your ${challenge.metric} challenge with ${opponentLogin} has ended! You scored ${creatorScore}.`,
      },
      {
        user_id: challenge.opponent_id,
        type: "challenge_completed",
        message: `Your ${challenge.metric} challenge with ${creatorLogin} has ended! You scored ${opponentScore}.`,
      }
    ];

    await supabaseAdmin.from("notifications").insert(notifications);
    processed++;
  }

  return NextResponse.json({ success: true, processed });
}
