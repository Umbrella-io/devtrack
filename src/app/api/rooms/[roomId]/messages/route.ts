import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getRoomById, getRoomMessages, sendRoomMessage } from '@/lib/supabase-rooms';
import { validateTextInput } from '@/lib/sanitize';
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
  const body = await req.json();
  const validation = validateTextInput(body?.content, 'content', 4000);
  if (!validation.ok)
    return NextResponse.json({ error: validation.error }, { status: 400 });
  const message = await sendRoomMessage(
    params.roomId,
    session.user.name,
    session.user.image ?? null,
    validation.value
  );
  return NextResponse.json(message, { status: 201 });
}