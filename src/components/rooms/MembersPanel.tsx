'use client';

import { useState } from 'react';
import type { RoomMember } from '@/types/rooms';
import InviteModal from './InviteModal';

interface Props {
  roomId: string;
  members: RoomMember[];
  isOwner: boolean;
  onMemberAdded: (username: string) => void;
}

export default function MembersPanel({ roomId, members, isOwner, onMemberAdded }: Props) {
  const [showInvite, setShowInvite] = useState(false);

  return (
    <aside className="w-56 shrink-0 border-l dark:border-gray-800 flex flex-col">
      <div className="p-4 border-b dark:border-gray-800 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Members ({members.length})
        </h3>
        {isOwner && (
          <button
            onClick={() => setShowInvite(true)}
            className="text-xs px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/60"
          >
            + Invite
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://github.com/${m.github_username}.png?size=32`}
              alt={m.github_username}
              className="w-7 h-7 rounded-full"
            />
            <div className="min-w-0">
              <p className="text-sm truncate">{m.github_username}</p>
              {m.role === 'owner' && (
                <span className="text-[10px] text-yellow-600 dark:text-yellow-400">owner</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {showInvite && (
        <InviteModal
          roomId={roomId}
          onClose={() => setShowInvite(false)}
          onInvited={(username) => {
            onMemberAdded(username);
            setShowInvite(false);
          }}
        />
      )}
    </aside>
  );
}

