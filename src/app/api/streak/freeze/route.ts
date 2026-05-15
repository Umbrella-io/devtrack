<<<<<<< HEAD
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
=======
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
>>>>>>> 1337d90 (feat: add streak freeze feature (#37))

export const dynamic = "force-dynamic";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

<<<<<<< HEAD
<<<<<<< HEAD
// GET /api/streak/freeze
// Returns whether the user currently has an unused freeze available.
export async function GET(req: NextRequest) {
=======
=======
// GET /api/streak/freeze
>>>>>>> 8c942cb (fix: address PR review — unique constraint, created_at, trailing newlines, revert lockfile)
// Returns whether the user currently has an unused freeze available.
export async function GET() {
>>>>>>> 1337d90 (feat: add streak freeze feature (#37))
  const session = await getServerSession(authOptions);
  if (!session?.githubId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

<<<<<<< HEAD
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
=======
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("github_id", session.githubId)
    .single();

  if (!user) return Response.json({ error: "User not found" }, { status: 404 });

>>>>>>> 1337d90 (feat: add streak freeze feature (#37))
  const today = todayStr();

  const { data: pending } = await supabaseAdmin
    .from("streak_freezes")
    .select("id, freeze_date")
<<<<<<< HEAD
    .eq("user_id", userId)
=======
    .eq("user_id", user.id)
>>>>>>> 1337d90 (feat: add streak freeze feature (#37))
    .gte("freeze_date", today)
    .limit(1);

  const hasFreeze = Array.isArray(pending) && pending.length > 0;

<<<<<<< HEAD
  return { hasFreeze, freezeDate: hasFreeze ? pending![0].freeze_date : null };
}

// POST /api/streak/freeze
=======
  return Response.json({ hasFreeze, freezeDate: hasFreeze ? pending![0].freeze_date : null });
}
<<<<<<< HEAD
>>>>>>> 1337d90 (feat: add streak freeze feature (#37))
=======

// POST /api/streak/freeze
>>>>>>> 8c942cb (fix: address PR review — unique constraint, created_at, trailing newlines, revert lockfile)
// Inserts a freeze for today. Fails if the user already holds an unused freeze.
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.githubId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

<<<<<<< HEAD
  const user = await resolveAppUser(session.githubId, session.githubLogin);
=======
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("github_id", session.githubId)
    .single();

>>>>>>> 1337d90 (feat: add streak freeze feature (#37))
  if (!user) return Response.json({ error: "User not found" }, { status: 404 });

  const today = todayStr();

<<<<<<< HEAD
<<<<<<< HEAD
  // Prevent users from stockpiling unused freezes
  const { count } = await supabaseAdmin
    .from("streak_freezes")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("freeze_date", today);

  const MAX_PENDING_FREEZES = 1;

  if (count !== null && count >= MAX_PENDING_FREEZES) {
    return Response.json(
      { error: "You already have a pending freeze." },
      { status: 409 }
    );
  }

=======
  // only 1 unused freeze at a time
>>>>>>> 1337d90 (feat: add streak freeze feature (#37))
  const { data: existing } = await supabaseAdmin
    .from("streak_freezes")
    .select("id")
    .eq("user_id", user.id)
<<<<<<< HEAD
    .eq("freeze_date", today)
    .maybeSingle();

  const { data: freeze, error } = await supabaseAdmin
    .from("streak_freezes")
    .upsert(
      { user_id: user.id, freeze_date: today },
      { onConflict: "user_id,freeze_date" }
    )
=======
    .gte("freeze_date", today)
    .limit(1);

  if (Array.isArray(existing) && existing.length > 0) {
    return Response.json(
      { error: "You already have an unused streak freeze." },
      { status: 409 }
    );
  }

=======
>>>>>>> 8c942cb (fix: address PR review — unique constraint, created_at, trailing newlines, revert lockfile)
  const { data: freeze, error } = await supabaseAdmin
    .from("streak_freezes")
    .insert({ user_id: user.id, freeze_date: today })
>>>>>>> 1337d90 (feat: add streak freeze feature (#37))
    .select()
    .single();

  if (error) {
    // Unique constraint violation — already has a freeze for today
    if (error.code === "23505") {
      return Response.json(
        { error: "You already have an unused streak freeze." },
        { status: 409 }
      );
    }
    return Response.json({ error: "Failed to apply freeze." }, { status: 500 });
  }

<<<<<<< HEAD
  const alreadyExisted = existing !== null;
  const statusCode = alreadyExisted ? 200 : 201;

  return Response.json(
    { freeze, already_existed: alreadyExisted },
    { status: statusCode }
  );
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

  if (error)
    return Response.json({ error: "Failed to cancel freeze" }, { status: 500 });

  return Response.json({ success: true });
}
=======
  return Response.json({ freeze }, { status: 201 });
}
<<<<<<< HEAD
>>>>>>> 1337d90 (feat: add streak freeze feature (#37))
=======
>>>>>>> 8c942cb (fix: address PR review — unique constraint, created_at, trailing newlines, revert lockfile)
