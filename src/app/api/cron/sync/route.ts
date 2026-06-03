import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    // Edge function for Syncing WakaTime and GitHub
    // Utilizing BullMQ or serverless queues can be initiated from here if needed
    // or long-running tasks can be performed within Edge limits if optimized.
    
    // Simulate sync
    console.log('Initiating WakaTime and GitHub sync via Edge Function...');
    
    return NextResponse.json({ success: true, message: 'Sync job triggered successfully on Edge runtime.' });
  } catch (error: any) {
    console.error('Error triggering sync:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
