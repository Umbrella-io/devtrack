import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { generateAISummary, buildEmailHtml } from "@/lib/digest";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Verify cron secret - fail closed if not configured
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: users, error } = await supabaseAdmin
      .from("users")
      .select("github_login, email, digest_unsubscribe_token")
      .eq("weekly_digest_opt_in", true)
      .not("email", "is", null);

    if (error) {
      console.error("Error fetching users for digest:", error);
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 }
      );
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ message: "No users opted in" });
    }

    const appUrl = process.env.NEXTAUTH_URL ?? "https://devtrack.app";
    let sentCount = 0;

    for (const user of users) {
      if (!user.email) continue;

      try {
        const aiSummary = await generateAISummary({
          userName: user.github_login ?? "Developer",
          currentStreak: 0,
          longestStreak: 0,
          commitsThisWeek: 0,
          topRepo: "—",
          prsOpened: 0,
          prsMerged: 0,
        });

        const htmlBody = buildEmailHtml({
          userName: user.github_login ?? "Developer",
          aiSummary,
          unsubscribeToken: user.digest_unsubscribe_token ?? "",
          appUrl,
        });

        if (process.env.RESEND_API_KEY) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: "DevTrack <digest@devtrack.com>",
              to: user.email,
              subject: "Your Weekly DevTrack Digest 🚀",
              html: htmlBody,
            }),
          });
        }

        sentCount++;
      } catch (userErr) {
        console.error(
          `[weekly-digest] Failed for ${user.github_login}:`,
          userErr
        );
      }
    }

    return NextResponse.json({ success: true, sentCount });
  } catch (err) {
    console.error("Cron weekly-digest failed:", err);
    return NextResponse.json(
      { error: "Failed to process digests" },
      { status: 500 }
    );
  }
}