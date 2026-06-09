import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveAppUser } from "@/lib/resolve-user";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.githubId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await resolveAppUser(session.githubId, session.githubLogin);
  if (!user) return Response.json({ error: "User not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const weeksParam = searchParams.get("weeks");
  const weeks = Math.min(
    Math.max(1, parseInt(weeksParam ?? "8", 10) || 8),
    52
  );

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - weeks * 7);

  const { data: histories, error } = await supabaseAdmin
    .from("goal_history")
    .select("goal_id, period_start, period_end, target, achieved, completed")
    .eq("user_id", user.id)
    .gte("period_end", since.toISOString())
    .order("period_end", { ascending: true });

  if (error) {
    console.error("Failed to fetch goal history:", error);
    return Response.json({ error: "Failed to fetch history" }, { status: 500 });
  }

  // Also fetch active goals so we can label lines by goal title
  const { data: goals } = await supabaseAdmin
    .from("goals")
    .select("id, title, unit")
    .eq("user_id", user.id);

  return Response.json({ histories: histories ?? [], goals: goals ?? [] });
}