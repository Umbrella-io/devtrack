import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { decryptToken } from "@/lib/crypto";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // To secure the cron job, check the authorization header
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch users with wakatime keys
  const { data: users, error } = await supabaseAdmin
    .from("users")
    .select("id, wakatime_api_key_encrypted, wakatime_api_key_iv")
    .not("wakatime_api_key_encrypted", "is", null)
    .not("wakatime_api_key_iv", "is", null);

  if (error) {
    console.error("Failed to fetch users for wakatime sync:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  let successCount = 0;
  let failureCount = 0;

  for (const user of users) {
    try {
      const apiKey = decryptToken(
        user.wakatime_api_key_encrypted!,
        user.wakatime_api_key_iv!
      );

      if (!apiKey) {
        console.error(`Decryption failed for user ${user.id}`);
        failureCount++;
        continue;
      }

      // Fetch from Wakatime
      const res = await fetch("https://wakatime.com/api/v1/users/current/summaries?range=Last%207%20Days", {
        headers: {
          Authorization: `Basic ${Buffer.from(apiKey + ":").toString("base64")}`,
        }
      });

      if (!res.ok) {
        console.error(`Wakatime API error for user ${user.id}: ${res.status}`);
        failureCount++;
        continue;
      }

      const data = await res.json();
      
      const statsToUpsert = data.data.map((day: any) => ({
        user_id: user.id,
        date: day.range.date,
        total_seconds: Math.round(day.grand_total.total_seconds),
        languages: day.languages.map((l: any) => ({ name: l.name, total_seconds: l.total_seconds, percent: l.percent })),
        projects: day.projects.map((p: any) => ({ name: p.name, total_seconds: p.total_seconds, percent: p.percent }))
      }));

      const { error: upsertError } = await supabaseAdmin
        .from("wakatime_stats")
        .upsert(statsToUpsert, { onConflict: "user_id, date" });

      if (upsertError) {
        console.error(`Failed to upsert wakatime stats for user ${user.id}:`, upsertError);
        failureCount++;
      } else {
        successCount++;
      }
    } catch (e) {
      console.error(`Error processing wakatime stats for user ${user.id}:`, e);
      failureCount++;
    }
  }

  return NextResponse.json({ success: successCount, failure: failureCount });
}
