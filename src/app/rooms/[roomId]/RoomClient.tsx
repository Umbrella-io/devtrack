'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { CollaborationRoom, RoomMember, RoomMessage } from '@/types/rooms';
import MessageFeed from '@/components/rooms/MessageFeed';
import MessageInput from '@/components/rooms/MessageInput';
import MembersPanel from '@/components/rooms/MembersPanel';

interface Props {
  room: CollaborationRoom & { is_owner: boolean };
  initialMembers: RoomMember[];
  initialMessages: RoomMessage[];
  currentUser: string;
  currentUserAvatar: string | null;
}

export default function RoomClient({
  room, initialMembers, initialMessages, currentUser,
}: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState<RoomMessage[]>(initialMessages);
  const [members, setMembers] = useState<RoomMember[]>(initialMembers);

  function handleSent(msg: RoomMessage) {
    setMessages((prev) => [...prev, msg]);
  }

  function handleMemberAdded(username: string) {
    setMembers((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        room_id: room.id,
        github_username: username,
        role: 'member',
        joined_at: new Date().toISOString(),
      },
    ]);
  }

  async function handleDeleteRoom() {
    if (!confirm('Are you sure you want to delete this room? This cannot be undone.')) return;
    const res = await fetch(`/api/rooms/${room.id}`, { method: 'DELETE' });
    if (res.ok) {
      router.push('/rooms');
    } else {
      const data = await res.json();
      alert(data.error ?? 'Failed to delete room');
    }
  }

  return (
    <div className="flex flex-col h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b border-[var(--border)] px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/rooms" className="text-sm text-gray-400 hover:text-gray-600">
            ← Rooms
          </Link>
          <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />
          <div>
            <h1 className="font-semibold text-base leading-tight">{room.name}</h1>
            <a
              href={`https://github.com/${room.repo_owner}/${room.repo_name}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:underline"
            >
              {room.repo_owner}/{room.repo_name}
            </a>
          </div>
        </div>

        {room.is_owner && (
          <button
            onClick={handleDeleteRoom}
            className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Delete Room
          </button>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-col flex-1 overflow-hidden">
          <MessageFeed
            roomId={room.id}
            currentUser={currentUser}
            initialMessages={messages}
          />
          <MessageInput roomId={room.id} onSent={handleSent} />
        </div>
        <MembersPanel
          roomId={room.id}
          members={members}
          isOwner={room.is_owner}
          onMemberAdded={handleMemberAdded}
        />
      </div>
    </div>
  );
}