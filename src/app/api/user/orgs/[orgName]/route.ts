import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveAppUser } from "@/lib/resolve-user";

export const dynamic = "force-dynamic";

interface ToggleRequest {
  included: boolean;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { orgName: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.githubId || !session?.githubLogin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await resolveAppUser(session.githubId, session.githubLogin);

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const body = (await request.json()) as ToggleRequest;
    const orgName = (params as Record<string, unknown>).orgName as string;

    if (!orgName || typeof body.included !== "boolean") {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }

    // Upsert the preference
    const { error } = await supabaseAdmin
      .from("user_org_preferences")
      .upsert(
        {
          user_id: user.id,
          org_name: orgName,
          included: body.included,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,org_name" }
      );

    if (error) {
      console.error("Failed to update org preference:", error);
      return NextResponse.json(
        { error: "Failed to update preference" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, org: orgName, included: body.included },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error toggling org preference:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
