import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getToken } from "next-auth/jwt";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    const userId = token?.githubId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    const todayDate = today.toISOString().split("T")[0];

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDate = yesterday.toISOString().split("T")[0];

    const { data: todayData, error: todayError } = await supabaseAdmin
      .from("daily_notes")
      .select("*")
      .eq("user_id", userId)
      .eq("date", todayDate)
      .single();

    if (todayError && todayError.code !== "PGRST116") {
      console.error("Failed to fetch today's daily note:", todayError);
      return NextResponse.json(
        { error: "Failed to fetch daily notes" },
        { status: 500 }
      );
    }

    const { data: yesterdayData, error: yesterdayError } = await supabaseAdmin
      .from("daily_notes")
      .select("*")
      .eq("user_id", userId)
      .eq("date", yesterdayDate)
      .single();

    if (yesterdayError && yesterdayError.code !== "PGRST116") {
      console.error("Failed to fetch yesterday's daily note:", yesterdayError);
      return NextResponse.json(
        { error: "Failed to fetch daily notes" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      todayNote: todayData?.note || "",
      yesterdayNote: yesterdayData?.note || "",
    });
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    const userId = token?.githubId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { note } = body;

    if (!note || !note.trim()) {
      return NextResponse.json({ error: "Note cannot be empty" }, { status: 400 });
    }

    if (note.length > 280) {
      return NextResponse.json({ error: "Maximum 280 characters allowed" }, { status: 400 });
    }

    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabaseAdmin
      .from("daily_notes")
      .upsert(
        { user_id: userId, date: today, note: note.trim() },
        { onConflict: "user_id,date" }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to save note" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
