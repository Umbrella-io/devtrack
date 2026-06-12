import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveAppUser } from "@/lib/resolve-user";

export const dynamic = "force-dynamic";

const GITHUB_API = "https://api.github.com";

async function fetchGithubMetric(login: string, metric: string, startTime: string, endTime: string, token?: string) {
  const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  let url = "";
  if (metric === "commits") {
    url = `${GITHUB_API}/search/commits?q=author:${login} author-date:${startTime}..${endTime}&per_page=1`;
  } else if (metric === "prs") {
    url = `${GITHUB_API}/search/issues?q=author:${login} type:pr is:merged merged:${startTime}..${endTime}&per_page=1`;
  } else return 0;

  try {
    const res = await fetch(url, { headers, cache: "no-store" });
    if (!res.ok) return 0;
    const data = await res.json() as { total_count?: number };
    return data.total_count || 0;
  } catch (err) {
    return 0;
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.githubId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await resolveAppUser(session.githubId, session.githubLogin);
  if (!user) return Response.json({ error: "User not found" }, { status: 404 });

  const { data: challenges, error } = await supabaseAdmin
    .from("challenges")
    .select("*, opponent:users!challenges_opponent_id_fkey(github_login, name), creator:users!challenges_creator_id_fkey(github_login, name)")
    .or(`creator_id.eq.${user.id},opponent_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch challenges:", error);
    return Response.json({ error: "Failed to fetch challenges" }, { status: 500 });
  }

  const githubToken = process.env.GITHUB_TOKEN;
  
  const challengesWithScores = await Promise.all(
    (challenges || []).map(async (c: any) => {
      if (c.status === "active" && c.creator?.github_login && c.opponent?.github_login) {
        const startStr = new Date(c.start_time).toISOString().split(".")[0] + "Z";
        const endStr = new Date().toISOString().split(".")[0] + "Z"; // up to now
        const creatorScore = await fetchGithubMetric(c.creator.github_login, c.metric, startStr, endStr, githubToken);
        const opponentScore = await fetchGithubMetric(c.opponent.github_login, c.metric, startStr, endStr, githubToken);
        return { ...c, creator_score: creatorScore, opponent_score: opponentScore };
      }
      return c;
    })
  );

  return Response.json({ challenges: challengesWithScores });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.githubId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch (e) {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { metric, duration_days } = body as Record<string, unknown>;

  if (typeof metric !== "string" || !["commits", "prs"].includes(metric)) {
    return Response.json({ error: "metric must be 'commits' or 'prs'" }, { status: 400 });
  }

  if (typeof duration_days !== "number" || !Number.isInteger(duration_days) || duration_days < 1 || duration_days > 30) {
    return Response.json({ error: "duration_days must be an integer between 1 and 30" }, { status: 400 });
  }

  const user = await resolveAppUser(session.githubId, session.githubLogin);
  if (!user) return Response.json({ error: "User not found" }, { status: 404 });

  const { data: challenge, error } = await supabaseAdmin
    .from("challenges")
    .insert({
      creator_id: user.id,
      metric,
      duration_days,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create challenge:", error);
    return Response.json({ error: "Failed to create challenge" }, { status: 500 });
  }

  return Response.json({ challenge }, { status: 201 });
}
