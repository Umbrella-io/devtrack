import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createHash } from "crypto";

export const dynamic = "force-dynamic";

const MAX_SESSIONS_PER_REQUEST = 100;
const MAX_SESSIONS_PER_USER = 365;
const ALLOWED_DAYS = [7, 30, 90];
const DEFAULT_DAYS = 30;

function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

async function authenticateApiKey(apiKey: string): Promise<string | null> {
  const keyHash = hashApiKey(apiKey);

  const { data: keyRecord } = await supabaseAdmin
    .from("local_coding_api_keys")
    .select("user_id")
    .eq("api_key_hash", keyHash)
    .single();

  if (!keyRecord) {
    return null;
  }

  await supabaseAdmin
    .from("local_coding_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("api_key_hash", keyHash);

  return keyRecord.user_id;
}

function validateDays(days: number): number {
  if (ALLOWED_DAYS.includes(days)) {
    return days;
  }
  return DEFAULT_DAYS;
}

interface SessionData {
  date: string;
  totalSeconds: number;
  fileCount: number;
  projectCount: number;
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return Response.json({ error: "API key required" }, { status: 401 });
  }

  const apiKey = authHeader.slice(7);
  const userId = await authenticateApiKey(apiKey);

  if (!userId) {
    return Response.json({ error: "Invalid API key" }, { status: 401 });
  }

  let body: { sessions?: SessionData[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sessions = body.sessions;
  if (!sessions || !Array.isArray(sessions) || sessions.length === 0) {
    return Response.json(
      { error: "Sessions array is required" },
      { status: 400 }
    );
  }

  if (sessions.length > MAX_SESSIONS_PER_REQUEST) {
    return Response.json(
      { error: `Too many sessions. Maximum ${MAX_SESSIONS_PER_REQUEST} per request.` },
      { status: 400 }
    );
  }

  const { count: existingCount } = await supabaseAdmin
    .from("local_coding_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  const newSessions = sessions.filter((s) => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(s.date)) {
      return false;
    }
    if (typeof s.totalSeconds !== "number" || s.totalSeconds < 0) {
      return false;
    }
    return true;
  });

  if (newSessions.length !== sessions.length) {
    return Response.json(
      { error: "Invalid session data found in array" },
      { status: 400 }
    );
  }

  if ((existingCount || 0) + newSessions.length > MAX_SESSIONS_PER_USER) {
    return Response.json(
      { error: `Session limit reached. Maximum ${MAX_SESSIONS_PER_USER} sessions per user.` },
      { status: 400 }
    );
  }

  const records = newSessions.map((session) => ({
    user_id: userId,
    date: session.date,
    total_seconds: session.totalSeconds,
    file_count: session.fileCount || 0,
    project_count: session.projectCount || 0,
  }));

  const { error: upsertError } = await supabaseAdmin
    .from("local_coding_sessions")
    .upsert(records, { onConflict: "user_id,date" });

  if (upsertError) {
    return Response.json({ error: "Failed to sync sessions" }, { status: 500 });
  }

  return Response.json({
    success: true,
    synced: records.length,
    message: "Sessions synced successfully",
  });
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return Response.json({ error: "API key required" }, { status: 401 });
  }

  const apiKey = authHeader.slice(7);
  const userId = await authenticateApiKey(apiKey);

  if (!userId) {
    return Response.json({ error: "Invalid API key" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const rawDays = parseInt(searchParams.get("days") || "30", 10);
  const days = validateDays(isNaN(rawDays) ? DEFAULT_DAYS : rawDays);
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);
  const fromDateStr = fromDate.toISOString().slice(0, 10);

  const { data: sessions } = await supabaseAdmin
    .from("local_coding_sessions")
    .select("*")
    .eq("user_id", userId)
    .gte("date", fromDateStr)
    .order("date", { ascending: false });

  return Response.json({ sessions: sessions || [] });
}
