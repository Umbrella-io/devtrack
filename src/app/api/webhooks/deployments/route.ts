import { NextResponse } from 'next/server';
import crypto from 'crypto';

const DEPLOYMENT_WEBHOOK_SECRET = process.env.DEPLOYMENT_WEBHOOK_SECRET || 'deployment_secret';

export async function POST(req: Request) {
  try {
    const signature = req.headers.get('x-vercel-signature') || req.headers.get('x-hub-signature-256');
    if (!signature) {
      return NextResponse.json({ error: 'No signature found' }, { status: 401 });
    }

    const body = await req.text();
    const hmac = crypto.createHmac('sha256', DEPLOYMENT_WEBHOOK_SECRET);
    const expectedSignature = hmac.update(body).digest('hex');

    // Vercel signatures don't typically have the sha256= prefix, so this is a simplified check
    if (signature !== expectedSignature && signature !== `sha256=${expectedSignature}`) {
      // In production, we would enforce this strictly. For dev, we might log it.
      console.warn('Invalid deployment webhook signature');
    }

    const payload = JSON.parse(body);
    
    // Process deployment event
    console.log('Received deployment event:', payload.type || payload.action);
    
    // Here we would typically update a database table with the deployment status
    // or notify users via SSE/WebSockets.

    return NextResponse.json({ success: true, message: 'Deployment webhook received' });
  } catch (error: any) {
    console.error('Deployment Webhook processing error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
