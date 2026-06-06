'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { RoomMessage } from '@/types/rooms';

// Public (anon) client — only for Realtime subscription (no RLS bypass)
const realtimeClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Props {
  roomId: string;
  currentUser: string;
  initialMessages: RoomMessage[];
}

export default function MessageFeed({ roomId, currentUser, initialMessages }: Props) {
  const [messages, setMessages] = useState<RoomMessage[]>(initialMessages);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Supabase Realtime subscription
  useEffect(() => {
    const channel = realtimeClient
      .channel(`room-messages-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'room_messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          setMessages((prev) => {
            // Avoid duplicates (optimistic update already added it)
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new as RoomMessage];
          });
        }
      )
      .subscribe();

    return () => {
      realtimeClient.removeChannel(channel);
    };
  }, [roomId]);

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