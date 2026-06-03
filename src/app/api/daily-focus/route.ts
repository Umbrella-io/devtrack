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

    const { searchParams } = new URL(req.url);
    let date = searchParams.get("date");

    if (!date) {
      date = new Date().toISOString().split("T")[0];
    }

    const { data } = await supabaseAdmin
      .from("daily_focus")
      .select("*")
      .eq("user_id", userId)
      .eq("date", date)
      .single();

    return NextResponse.json({
      goal: data?.goal_text || "",
    });
  } catch (error) {
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
    const { goal_text, date } = body;

    if (!goal_text || !goal_text.trim()) {
      return NextResponse.json({ error: "Goal cannot be empty" }, { status: 400 });
    }

    const targetDate = date || new Date().toISOString().split("T")[0];

    const { data, error } = await supabaseAdmin
      .from("daily_focus")
      .upsert(
        { user_id: userId, date: targetDate, goal_text: goal_text.trim() },
        { onConflict: "user_id,date" }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to save goal" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    const userId = token?.githubId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("daily_focus")
      .delete()
      .eq("user_id", userId)
      .eq("date", date);

    if (error) {
      return NextResponse.json({ error: "Failed to clear goal" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
