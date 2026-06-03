import { NextResponse } from 'next/server';
import crypto from 'crypto';

const secret = process.env.GITHUB_WEBHOOK_SECRET;

export async function POST(req: Request) {
  // Fail fast if the webhook secret is not configured
  if (!secret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }

  try {
    const signature = req.headers.get('x-hub-signature-256');
    if (!signature) {
      return NextResponse.json({ error: 'No signature found' }, { status: 401 });
    }

    const body = await req.text();
    const hmac = crypto.createHmac('sha256', secret);
    const expectedSignature = `sha256=${hmac.update(body).digest('hex')}`;

    // Use timingSafeEqual to prevent timing attacks
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = req.headers.get('x-github-event');
    const payload = JSON.parse(body);

    if (event === 'push') {
      const repo = payload.repository?.full_name;
      const branch = payload.ref?.replace('refs/heads/', '');
      const commits = payload.commits?.length ?? 0;
      const pusher = payload.pusher?.name;

      // Here we would typically update the database with the latest commit data
      // to replace polling-based sync (e.g., update WakaTime/GitHub activity).
      console.log(`[GitHub Webhook] Push to ${repo}/${branch} by ${pusher} (${commits} commits)`);

      return NextResponse.json({
        success: true,
        message: `Processed push event: ${commits} commit(s) to ${branch}`,
      });
    }

    // For non-push events, acknowledge but take no action
    return NextResponse.json({ success: true, message: `Event '${event}' received but not processed` });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[GitHub Webhook] Processing error:', errorMessage);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
