import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getRoomById, getRoomMessages, sendRoomMessage } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(
  req: Request,
  { params }: { params: { roomId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const room = await getRoomById(params.roomId, session.user.name);
  if (!room) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const url = new URL(req.url);
  const before = url.searchParams.get('before') ?? undefined;
  const messages = await getRoomMessages(params.roomId, 50, before);
  return NextResponse.json(messages);
}

export async function POST(
  req: Request,
  { params }: { params: { roomId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const room = await getRoomById(params.roomId, session.user.name);
  if (!room) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { content } = await req.json();
  if (!content?.trim())
    return NextResponse.json({ error: 'Content required' }, { status: 400 });
  if (content.length > 4000)
    return NextResponse.json({ error: 'Message too long' }, { status: 400 });
  const message = await sendRoomMessage(
    params.roomId,
    session.user.name,
    session.user.image ?? null,
    content.trim()
  );
  return NextResponse.json(message, { status: 201 });
}