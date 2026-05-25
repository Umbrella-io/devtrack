import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveAppUser } from "@/lib/resolve-user";
import { decryptToken } from "@/lib/crypto";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.githubId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await resolveAppUser(session.githubId, session.githubLogin);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .select("wakatime_api_key_encrypted, wakatime_api_key_iv")
      .eq("id", user.id)
      .single();

    if (userError || !userData?.wakatime_api_key_encrypted || !userData?.wakatime_api_key_iv) {
      return NextResponse.json({ error: "Wakatime not configured", not_configured: true }, { status: 404 });
    }

    const apiKey = decryptToken(userData.wakatime_api_key_encrypted, userData.wakatime_api_key_iv);
    if (!apiKey) {
      return NextResponse.json({ error: "Failed to decrypt API key", not_configured: true }, { status: 500 });
    }

    const authHeader = `Basic ${Buffer.from(apiKey + ":").toString("base64")}`;

    const res = await fetch("https://wakatime.com/api/v1/users/current/summaries?range=Last%207%20Days", {
      headers: { Authorization: authHeader },
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("Wakatime API error:", res.status, res.statusText);
      return NextResponse.json({ error: "Failed to fetch from Wakatime" }, { status: 500 });
    }

    const json = await res.json();
    const summaries = json.data || [];

    if (summaries.length === 0) {
      return NextResponse.json({ hasData: false });
    }

    // Process data
    const today = summaries[summaries.length - 1];
    const todaysSeconds = today?.grand_total?.total_seconds || 0;

    let totalSeconds7Days = 0;
    const languagesMap: Record<string, number> = {};
    const projectsMap: Record<string, number> = {};

    const chartData = summaries.map((day: any) => {
      const dateStr = day.range.date; // e.g. 2023-10-01
      const totalSeconds = day.grand_total.total_seconds || 0;
      totalSeconds7Days += totalSeconds;

      day.languages?.forEach((lang: any) => {
        languagesMap[lang.name] = (languagesMap[lang.name] || 0) + lang.total_seconds;
      });

      day.projects?.forEach((proj: any) => {
        projectsMap[proj.name] = (projectsMap[proj.name] || 0) + proj.total_seconds;
      });

      return {
        date: dateStr,
        hours: parseFloat((totalSeconds / 3600).toFixed(2)),
      };
    });

    const getTop = (map: Record<string, number>) => {
      return Object.entries(map).sort((a, b) => b[1] - a[1])[0]?.[0] || "None";
    };

    return NextResponse.json({
      hasData: true,
      todaysSeconds,
      totalSeconds7Days,
      chartData,
      topLanguage: getTop(languagesMap),
      topProject: getTop(projectsMap),
    });
  } catch (error) {
    console.error("Error fetching Wakatime metrics:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
