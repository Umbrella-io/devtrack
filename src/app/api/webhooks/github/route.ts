import { NextRequest } from "next/server";
import { sendSSEEvent } from "@/lib/sse";
import { createHmac, timingSafeEqual } from "crypto";

export async function POST(req: NextRequest) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const signature = req.headers.get("x-hub-signature-256");
  if (!signature) {
    return new Response("Missing signature", { status: 401 });
  }

  const body = await req.text();
  const hmac = createHmac("sha256", secret);
  hmac.update(body);
  const expectedSignature = `sha256=${hmac.digest("hex")}`;

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    sigBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    return new Response("Invalid signature", { status: 401 });
  }

  const event = req.headers.get("x-github-event");
  const payload = JSON.parse(body);

  if (event === "push") {
    const userId = payload?.sender?.login;
    if (userId) {
      sendSSEEvent(userId, "commit", {
        repo: payload?.repository?.name,
        message: payload?.head_commit?.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  return new Response("OK", { status: 200 });
}