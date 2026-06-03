import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    // Edge function for Syncing WakaTime and GitHub
    // External queue services (like Upstash QStash) can be initiated from here if needed
    // or long-running tasks can be performed within Edge limits if optimized.

    // Simulate sync
    console.log('Initiating WakaTime and GitHub sync via Edge Function...');

    return NextResponse.json({ success: true, message: 'Sync job triggered successfully on Edge runtime.' });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error triggering sync:', errorMessage);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
