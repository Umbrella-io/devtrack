import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

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
    let page = 0;
    let hasMore = true;
    let sentCount = 0;
    let errorCount = 0;

    // 2. Paginated loop - fetch and send PAGE_SIZE users at a time
    while (hasMore) {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data: users, error } = await supabaseAdmin
        .from("users")
        .select("github_login, email")
        .eq("weekly_digest_opt_in", true)
        .not("email", "is", null)
        .range(from, to);

      if (error) {
        console.error(`Error fetching users page ${page}:`, error);
        return NextResponse.json(
          { error: "Internal Server Error", sentCount },
          { status: 500 }
        );
      }

      // No more users or last page was a partial page
      if (!users || users.length === 0) {
        hasMore = false;
        break;
      }

      if (users.length < PAGE_SIZE) {
        hasMore = false;
      }

      // 3. Send emails in parallel within this page (bounded concurrency)
      const results = await Promise.allSettled(
        users
          .filter((user) => !!user.email)
          .map((user) => sendDigestEmail(user.github_login, user.email!))
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          sentCount++;
        } else {
          errorCount++;
          console.error("Failed to send digest email:", result.reason);
    // 3. For each user, send the email
    // Minimal template logic to prevent timeouts and keep implementation clean
    let sentCount = 0;
    let failedCount = 0;
    
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
        const res = await fetch("https://api.resend.com/emails", {
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

        if (!res.ok) {
          failedCount++;
          console.error(`Failed to send weekly digest to ${user.email}: ${res.status}`);
          continue;
        }
      }

      page++;
    }

    return NextResponse.json({ success: true, sentCount, errorCount });

    return NextResponse.json({ success: true, sentCount, failedCount });
  } catch (err) {
    console.error("Cron weekly-digest failed:", err);
    return NextResponse.json(
      { error: "Failed to process digests" },
      { status: 500 }
    );
  }
}

async function sendDigestEmail(
  githubLogin: string,
  email: string
): Promise<void> {
  const htmlBody = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Your Weekly DevTrack Digest</h2>
      <p>Hi ${githubLogin},</p>
      <p>Here is your coding activity summary for the past week!</p>
      <p><strong>Keep up the great work!</strong></p>
      <hr style="border: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #666;">
        You are receiving this because you opted into the Weekly Email Digest in your DevTrack settings.
      </p>
    </div>
  `;

  if (!process.env.RESEND_API_KEY) return;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "DevTrack <digest@devtrack.com>",
      to: email,
      subject: "Your Weekly DevTrack Digest",
      html: htmlBody,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend API error ${res.status}: ${text}`);
  }
}