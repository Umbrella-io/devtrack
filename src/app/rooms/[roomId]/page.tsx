import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { getRoomById, getRoomMembers, getRoomMessages } from '@/lib/supabase-rooms';
import RoomClient from './RoomClient';

interface Props {
  params: { roomId: string };
}

export default async function RoomPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) redirect('/api/auth/signin');
  const [room, members, messages] = await Promise.all([
    getRoomById(params.roomId, session.user.name),
    getRoomMembers(params.roomId),
    getRoomMessages(params.roomId, 50),
  ]);
  if (!room) notFound();
  return (
    <RoomClient
      room={room}
      initialMembers={members}
      initialMessages={messages}
      currentUser={session.user.name}
      currentUserAvatar={session.user.image ?? null}
    />
  );
}