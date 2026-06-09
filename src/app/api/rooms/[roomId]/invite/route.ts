import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getRoomById, getRoomMembers, addRoomMember } from '@/lib/supabase-rooms';
import { githubUsernamesEqual, normalizeRoomGithubUsername } from '@/lib/rooms';
import { NextResponse } from 'next/server';

export async function POST(
  req: Request,
  { params }: { params: { roomId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.githubLogin)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const room = await getRoomById(params.roomId, session.githubLogin);
  if (!room) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!room.is_owner)
    return NextResponse.json({ error: 'Only the room owner can invite' }, { status: 403 });
  const { github_username } = await req.json();
  const normalizedUsername = normalizeRoomGithubUsername(github_username);
  if (!normalizedUsername)
    return NextResponse.json({ error: 'Valid github_username required' }, { status: 400 });
  const ghRes = await fetch(`https://api.github.com/users/${encodeURIComponent(normalizedUsername)}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      ...(process.env.GITHUB_TOKEN
        ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
        : {}),
    },
  });
  if (ghRes.status === 404)
    return NextResponse.json({ error: `GitHub user "${normalizedUsername}" does not exist` }, { status: 404 });
  if (!ghRes.ok)
    return NextResponse.json({ error: 'Could not verify GitHub user' }, { status: 502 });
  const githubUser = await ghRes.json() as { login?: string };
  const canonicalUsername = normalizeRoomGithubUsername(githubUser.login) ?? normalizedUsername;
  const members = await getRoomMembers(params.roomId);
  if (members.some((m) => githubUsernamesEqual(m.github_username, canonicalUsername)))
    return NextResponse.json({ error: 'User is already a member' }, { status: 409 });
  await addRoomMember(params.roomId, canonicalUsername);
  return NextResponse.json({ success: true });
}
