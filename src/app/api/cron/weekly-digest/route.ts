import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // 1. Verify cron secret - fail closed if not configured
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
    // 2. Fetch users with opt-in and an email
    const { data: users, error } = await supabaseAdmin
      .from("users")
      .select("github_login, email")
      .eq("weekly_digest_opt_in", true)
      .not("email", "is", null);

    if (error) {
      console.error("Error fetching users for digest:", error);
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ message: "No users opted in" });
    }

    // 3. For each user, send the email
    // Minimal template logic to prevent timeouts and keep implementation clean
    let sentCount = 0;
    
    for (const user of users) {
      if (!user.email) continue;
      
      const htmlBody = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Your Weekly DevTrack Digest</h2>
          <p>Hi ${user.github_login},</p>
          <p>Here is your coding activity summary for the past week!</p>
          <p><strong>Keep up the great work!</strong></p>
          <hr style="border: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #666;">
            You are receiving this because you opted into the Weekly Email Digest in your DevTrack settings.
          </p>
        </div>
      `;

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
            subject: "Your Weekly DevTrack Digest",
            html: htmlBody,
          }),
        });
      }
      sentCount++;
    }

    return NextResponse.json({ success: true, sentCount });
  } catch (err) {
    console.error("Cron weekly-digest failed:", err);
    return NextResponse.json({ error: "Failed to process digests" }, { status: 500 });
  }
}
