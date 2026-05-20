import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

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

  const { data: keyRecord } = await supabaseAdmin
    .from("local_coding_api_keys")
    .select("user_id")
    .eq("api_key", apiKey)
    .single();

  if (!keyRecord) {
    return Response.json({ error: "Invalid API key" }, { status: 401 });
  }

  await supabaseAdmin
    .from("local_coding_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("api_key", apiKey);

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

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  for (const session of sessions) {
    if (!dateRegex.test(session.date)) {
      return Response.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }
    if (
      typeof session.totalSeconds !== "number" ||
      session.totalSeconds < 0
    ) {
      return Response.json(
        { error: "totalSeconds must be a non-negative number" },
        { status: 400 }
      );
    }
  }

  const records = sessions.map((session) => ({
    user_id: keyRecord.user_id,
    date: session.date,
    total_seconds: session.totalSeconds,
    file_count: session.fileCount || 0,
    project_count: session.projectCount || 0,
  }));

  for (const record of records) {
    await supabaseAdmin
      .from("local_coding_sessions")
      .upsert(record, { onConflict: "user_id,date" });
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

  const { data: keyRecord } = await supabaseAdmin
    .from("local_coding_api_keys")
    .select("user_id")
    .eq("api_key", apiKey)
    .single();

  if (!keyRecord) {
    return Response.json({ error: "Invalid API key" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") || "30", 10);
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);
  const fromDateStr = fromDate.toISOString().slice(0, 10);

  const { data: sessions } = await supabaseAdmin
    .from("local_coding_sessions")
    .select("*")
    .eq("user_id", keyRecord.user_id)
    .gte("date", fromDateStr)
    .order("date", { ascending: false });

  return Response.json({ sessions: sessions || [] });
}