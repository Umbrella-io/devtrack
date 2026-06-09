import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createRoom, getRoomsForUser } from '@/lib/supabase-rooms';
import { NextResponse } from 'next/server';
import type { CreateRoomPayload } from '@/types/rooms';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const rooms = await getRoomsForUser(session.user.name);
    return NextResponse.json(rooms);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body: CreateRoomPayload = await req.json();
  if (!body.name?.trim() || !body.repo_owner?.trim() || !body.repo_name?.trim())
    return NextResponse.json({ error: 'name, repo_owner, and repo_name are required' }, { status: 400 });
  try {
    const room = await createRoom(body, session.user.name);
    return NextResponse.json(room, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}