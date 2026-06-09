'use client';

import { useEffect, useRef } from 'react';
import type { RoomMessage } from '@/types/rooms';

const POLL_INTERVAL_MS = 5_000;

interface Props {
  roomId: string;
  currentUser: string;
  messages: RoomMessage[];
  onNewMessages: (msgs: RoomMessage[]) => void;
}

export default function MessageFeed({ roomId, currentUser, messages, onNewMessages }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const latestTimestampRef = useRef<string | null>(
    messages.length > 0 ? messages[messages.length - 1].created_at : null
  );

  // Keep the latest-timestamp cursor in sync as the message list grows.
  useEffect(() => {
    if (messages.length > 0) {
      latestTimestampRef.current = messages[messages.length - 1].created_at;
    }
  }, [messages]);

  // Scroll to bottom whenever new messages arrive.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Poll the authenticated API route for messages from other participants.
  // The Supabase anon key carries no JWT, so the RLS policies on room_messages
  // block all Realtime broadcasts for NextAuth-based sessions. Polling the
  // server-side authenticated route is the correct approach.
  useEffect(() => {
    const poll = async () => {
      const after = latestTimestampRef.current;
      if (!after) return;
      try {
        const res = await fetch(
          `/api/rooms/${roomId}/messages?after=${encodeURIComponent(after)}`
        );
        if (!res.ok) return;
        const incoming: RoomMessage[] = await res.json();
        if (incoming.length > 0) {
          onNewMessages(incoming);
        }
      } catch {
        // Network error — silently retry on the next tick.
      }
    };

    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [roomId, onNewMessages]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
      {messages.length === 0 && (
        <p className="text-center text-sm text-gray-400 mt-8">
          No messages yet. Start the conversation!
        </p>
      )}

      {messages.map((msg) => {
        const isMe = msg.sender_username === currentUser;
        return (
          <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
            {/* eslint-disable @next/next/no-img-element */}
            {msg.sender_avatar ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={msg.sender_avatar}
                alt={msg.sender_username}
                className="w-8 h-8 rounded-full shrink-0 mt-1"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700 shrink-0 mt-1 flex items-center justify-center text-xs font-bold">
                {msg.sender_username[0].toUpperCase()}
              </div>
            )}

            <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
              {!isMe && (
                <span className="text-xs text-gray-500 mb-0.5 ml-1">{msg.sender_username}</span>
              )}
              <div
                className={`px-3 py-2 rounded-2xl text-sm break-words ${
                  isMe
                    ? 'bg-blue-600 text-white rounded-tr-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-sm'
                }`}
              >
                {msg.content}
              </div>
              <span className="text-[10px] text-gray-400 mt-0.5 mx-1">
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        );
      })}

      <div ref={bottomRef} />
    </div>
  );
}
