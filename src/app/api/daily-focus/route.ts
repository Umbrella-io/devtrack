import { getServerSession } from "next-auth";
import { type NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveAppUser } from "@/lib/resolve-user";
import { validateTextInput } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

const MAX_GOAL_TEXT_LEN = 280;

export interface DailyFocusRecord {
  id: string;
  user_id: string;
  focus_date: string;
  goal_text: string;
  created_at: string;
  updated_at: string;
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function isValidDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value));
}

// ── GET /api/daily-focus?date=YYYY-MM-DD (defaults to today) ─────────────────

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.githubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await resolveAppUser(session.githubId, session.githubLogin);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const dateParam = req.nextUrl.searchParams.get("date");
  const focusDate =
    dateParam && isValidDateString(dateParam) ? dateParam : todayDateString();

  const { data, error } = await supabaseAdmin
    .from("daily_focus")
    .select("*")
    .eq("user_id", user.id)
    .eq("focus_date", focusDate)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch focus" },
      { status: 500 }
    );
  }

  return NextResponse.json({ focus: (data as DailyFocusRecord | null) ?? null });
}

// ── PUT /api/daily-focus — upsert (create or update) ─────────────────────────

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.githubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { goal_text, focus_date } = body as Record<string, unknown>;

  const validation = validateTextInput(goal_text, "goal_text", MAX_GOAL_TEXT_LEN);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  let safeDate = todayDateString();
  if (typeof focus_date === "string" && isValidDateString(focus_date)) {
    safeDate = focus_date;
  }

  const user = await resolveAppUser(session.githubId, session.githubLogin);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("daily_focus")
    .upsert(
      {
        user_id: user.id,
        focus_date: safeDate,
        goal_text: validation.value,
        updated_at: now,
      },
      { onConflict: "user_id,focus_date" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to save focus" }, { status: 500 });
  }

  return NextResponse.json({ focus: data as DailyFocusRecord });
}

// ── DELETE /api/daily-focus?date=YYYY-MM-DD (defaults to today) ──────────────

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.githubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await resolveAppUser(session.githubId, session.githubLogin);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const dateParam = req.nextUrl.searchParams.get("date");
  const focusDate =
    dateParam && isValidDateString(dateParam) ? dateParam : todayDateString();

  const { error } = await supabaseAdmin
    .from("daily_focus")
    .delete()
    .eq("user_id", user.id)
    .eq("focus_date", focusDate);

  if (error) {
    return NextResponse.json(
      { error: "Failed to delete focus" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
