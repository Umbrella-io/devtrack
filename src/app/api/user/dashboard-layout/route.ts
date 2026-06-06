import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveAppUser } from "@/lib/resolve-user";
import { supabaseAdmin } from "@/lib/supabase";
import {
  getDefaultDashboardLayout,
  normalizeDashboardLayout,
} from "@/lib/dashboard-layout";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.githubId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const appUserId = await resolveAppUser(session.githubId, session.githubLogin);

    const { data, error } = await supabaseAdmin
      .from("users")
      .select("dashboard_layout")
      .eq("id", appUserId)
      .single();

    if (error) {
      return NextResponse.json({
        layout: getDefaultDashboardLayout(),
        source: "default",
      });
    }

    return NextResponse.json({
      layout: normalizeDashboardLayout(data?.dashboard_layout),
      source: "database",
    });
  } catch {
    return NextResponse.json({
      layout: getDefaultDashboardLayout(),
      source: "fallback",
    });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.githubId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { layout?: unknown };
    const layout = normalizeDashboardLayout(body.layout);

    const appUserId = await resolveAppUser(session.githubId, session.githubLogin);

    const { error } = await supabaseAdmin
      .from("users")
      .update({
        dashboard_layout: layout,
        updated_at: new Date().toISOString(),
      })
      .eq("id", appUserId);

    if (error) {
      return NextResponse.json(
        { error: "Failed to save dashboard layout" },
        { status: 500 },
      );
    }

    return NextResponse.json({ layout });
  } catch {
    return NextResponse.json(
      { error: "Failed to save dashboard layout" },
      { status: 500 },
    );
  }
}