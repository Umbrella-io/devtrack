export interface UserDigestData {
  userName: string;
  currentStreak: number;
  longestStreak: number;
  commitsThisWeek: number;
  topRepo: string;
  prsOpened: number;
  prsMerged: number;
}

// Calls Gemini 1.5 Flash to generate a short personalized AI summary
export async function generateAISummary(data: UserDigestData): Promise<string> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a friendly developer coach. Write a short, encouraging 2-3 sentence productivity summary for a developer based on their weekly GitHub stats. Plain paragraph text only.

Stats for ${data.userName}:
- Commits this week: ${data.commitsThisWeek}
- Current streak: ${data.currentStreak} days
- Longest streak ever: ${data.longestStreak} days
- Most active repository: ${data.topRepo}
- PRs opened: ${data.prsOpened}, merged: ${data.prsMerged}

Return only the summary text.`
            }]
          }]
        }),
      }
    );
    const result = await response.json();
    return result.candidates?.[0]?.content?.parts?.[0]?.text ??
      `Great effort this week, ${data.userName} — every commit counts!`;
  } catch {
    return `${data.userName} had ${data.commitsThisWeek} commits this week with a ${data.currentStreak}-day streak. Keep it up!`;
  }
}

// Builds the inline-styled HTML email body
// All styles are inline — Gmail strips <style> blocks
export function buildEmailHtml({
  userName,
  aiSummary,
  unsubscribeToken,
  appUrl,
}: {
  userName: string;
  aiSummary: string;
  unsubscribeToken: string;
  appUrl: string;
}): string {
  const unsubscribeUrl = unsubscribeToken
    ? `${appUrl}/unsubscribe?token=${unsubscribeToken}`
    : null;

  const weekLabel = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background-color:#f4f4f5;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0"
        style="background-color:#ffffff;border-radius:12px;
               box-shadow:0 1px 4px rgba(0,0,0,0.08);overflow:hidden;">

        <tr>
          <td style="background-color:#1d4ed8;padding:28px 32px;">
            <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">
              DevTrack
            </p>
            <p style="margin:4px 0 0;font-size:13px;color:#bfdbfe;">
              Weekly Digest &nbsp;·&nbsp; ${weekLabel}
            </p>
          </td>
        </tr>

        <tr>
          <td style="padding:28px 32px 0;">
            <p style="margin:0 0 16px;font-size:15px;color:#374151;">
              Hey <strong>${userName}</strong> 👋
            </p>
            <div style="background-color:#eff6ff;border-left:4px solid #2563eb;
                 border-radius:0 8px 8px 0;padding:16px 20px;">
              <p style="margin:0;font-size:14px;line-height:1.75;color:#1e40af;">
                ${aiSummary}
              </p>
            </div>
          </td>
        </tr>

        <tr>
          <td style="padding:28px 32px;">
            <a href="${appUrl}/dashboard"
               style="display:inline-block;background-color:#1d4ed8;color:#ffffff;
                      text-decoration:none;padding:12px 24px;border-radius:8px;
                      font-size:14px;font-weight:600;">
              View Full Dashboard →
            </a>
          </td>
        </tr>

        <tr>
          <td style="background-color:#f9fafb;border-top:1px solid #f3f4f6;
               padding:20px 32px;">
            <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;
               line-height:1.6;">
              You are receiving this because you opted in to weekly digests on DevTrack.
              ${
                unsubscribeUrl
                  ? `<br/><a href="${unsubscribeUrl}"
                       style="color:#9ca3af;text-decoration:underline;">
                       Unsubscribe
                     </a>`
                  : ""
              }
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}