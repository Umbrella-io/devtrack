import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { fetchUserOrgs } from "@/lib/github";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveAppUser } from "@/lib/resolve-user";

export const dynamic = "force-dynamic";

interface OrgPreference {
  login: string;
  included: boolean;
  public_repos: number;
  avatar_url: string;
  description: string | null;
}

interface OrgsResponse {
  orgs: OrgPreference[];
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken || !session.githubId || !session.githubLogin) {
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

    // Fetch user's orgs from GitHub
    let githubOrgs: Awaited<ReturnType<typeof fetchUserOrgs>> = [];
    try {
      githubOrgs = await fetchUserOrgs(session.accessToken);
    } catch (err) {
      console.error("Failed to fetch orgs from GitHub:", err);
      // Return empty list if fetch fails
    }

    // Get user's preferences from database
    const { data: preferences, error: prefError } = await supabaseAdmin
      .from("user_org_preferences")
      .select("org_name, included")
      .eq("user_id", user.id);

    if (prefError) {
      console.error("Failed to fetch org preferences:", prefError);
      return NextResponse.json(
        { error: "Failed to fetch org preferences" },
        { status: 500 }
      );
    }

    const prefMap = new Map<string, boolean>();
    (preferences ?? []).forEach((pref) => {
      prefMap.set(pref.org_name, pref.included);
    });

    // Build response with both GitHub orgs and user preferences
    const orgs: OrgPreference[] = githubOrgs.map((org) => ({
      login: org.login,
      included: prefMap.get(org.login) ?? true, // Default to included if not in preferences
      public_repos: org.public_repos,
      avatar_url: org.avatar_url,
      description: org.description,
    }));

    return NextResponse.json(
      { orgs } as OrgsResponse,
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching orgs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
