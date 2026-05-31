import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/* ---------------- GET LAYOUT ---------------- */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized", layout: [], hidden: [] },
        { status: 401 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("dashboard_layouts")
      .select("layout, hidden")
      .eq("user_id", session.user.email)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ layout: [], hidden: [] }, { status: 200 });
    }

    return NextResponse.json({
      layout: data?.layout ?? [],
      hidden: data?.hidden ?? [],
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Server error", layout: [], hidden: [] },
      { status: 500 }
    );
  }
}

/* ---------------- SAVE LAYOUT ---------------- */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { layout, hidden } = body;

    if (!Array.isArray(layout) || !Array.isArray(hidden)) {
      return NextResponse.json(
        { error: "Invalid payload" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("dashboard_layouts")
      .upsert({
        user_id: session.user.email,
        layout,
        hidden,
      });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}