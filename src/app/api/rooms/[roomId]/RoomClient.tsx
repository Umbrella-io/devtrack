'use client';

import { useState } from 'react';
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

  return (
    <div className="flex flex-col h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b border-[var(--border)] px-4 py-3 flex items-center gap-3 shrink-0">
        <Link href="/rooms" className="text-sm text-gray-400 hover:text-gray-600">
          ← Rooms
        </Link>
        <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />
        <div>
          <h1 className="font-semibold text-base leading-tight">{room.name}</h1>
          
            <a href={`https://github.com/${room.repo_owner}/${room.repo_name}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-500 hover:underline"
          >
            {room.repo_owner}/{room.repo_name}
          </a>
        </div>
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
