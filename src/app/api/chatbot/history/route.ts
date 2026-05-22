import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.email || session.user.name || "unknown-user";

    const { data, error } = await supabaseAdmin
      .from("chatbot_messages")
      .select("id, role, message, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(30);

    if (error) {
      return NextResponse.json(
        { error: "Failed to load chat history" },
        { status: 500 }
      );
    }

    return NextResponse.json({ messages: data || [] });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong while loading chat history" },
      { status: 500 }
    );
  }
}
