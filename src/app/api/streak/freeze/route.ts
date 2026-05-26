import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveAppUser } from "@/lib/resolve-user";
import {
  isMetricsCacheBypassed,
  METRICS_CACHE_TTL_SECONDS,
  metricsCacheKey,
  withMetricsCache,
} from "@/lib/metrics-cache";

export const dynamic = "force-dynamic";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// GET /api/streak/freeze
// Returns whether the user currently has an unused freeze available.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.githubId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await resolveAppUser(session.githubId, session.githubLogin);
  if (!user) return Response.json({ error: "User not found" }, { status: 404 });

  const cacheKey = metricsCacheKey(user.id, "streak_freeze", {});
  const bypass = isMetricsCacheBypassed(req);

  const status = await withMetricsCache(
    {
      bypass,
      key: cacheKey,
      ttlSeconds: METRICS_CACHE_TTL_SECONDS.streak,
    },
    async () => getFreezeStatus(user.id)
  );

  return Response.json(status);
}

async function getFreezeStatus(userId: string) {
  const today = todayStr();

  const { data: pending } = await supabaseAdmin
    .from("streak_freezes")
    .select("id, freeze_date")
    .eq("user_id", userId)
    .gte("freeze_date", today)
    .limit(1);

  const hasFreeze = Array.isArray(pending) && pending.length > 0;

  return { hasFreeze, freezeDate: hasFreeze ? pending![0].freeze_date : null };
}

// POST /api/streak/freeze
// Inserts a freeze for today. Fails if the user already holds an unused freeze.
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.githubId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await resolveAppUser(session.githubId, session.githubLogin);
  if (!user) return Response.json({ error: "User not found" }, { status: 404 });

  const today = todayStr();

  const { data: existing } = await supabaseAdmin
    .from("streak_freezes")
    .select("id")
    .eq("user_id", user.id)
    .eq("freeze_date", today)
    .maybeSingle();

  const { data: freeze, error } = await supabaseAdmin
    .from("streak_freezes")
    .upsert({ user_id: user.id, freeze_date: today }, { onConflict: "user_id,freeze_date" })
    .select()
    .single();

  if (error) {
    return Response.json({ error: "Failed to apply freeze." }, { status: 500 });
  }

  const alreadyExisted = existing !== null;

  return Response.json({ freeze, already_existed: alreadyExisted }, { status: 201 });
}

// DELETE /api/streak/freeze
// Removes today's active freeze for the authenticated user.
export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.githubId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await resolveAppUser(session.githubId, session.githubLogin);
  if (!user) return Response.json({ error: "User not found" }, { status: 404 });

  const { error } = await supabaseAdmin
    .from("streak_freezes")
    .delete()
    .eq("user_id", user.id)
    .eq("freeze_date", todayStr());

  if (error) return Response.json({ error: "Failed to cancel freeze" }, { status: 500 });

  return Response.json({ success: true });
}
