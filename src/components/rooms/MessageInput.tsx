'use client';

import { useState } from 'react';
import type { RoomMessage } from '@/types/rooms';

interface Props {
  roomId: string;
  onSent: (message: RoomMessage) => void;
}

export default function MessageInput({ roomId, onSent }: Props) {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || sending) return;

    setSending(true);
    const res = await fetch(`/api/rooms/${roomId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: content.trim() }),
    });

    setSending(false);

    if (res.ok) {
      const message = await res.json();
      onSent(message);
      setContent('');
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as unknown as React.FormEvent);
    }
  }

  return (
    <form
      onSubmit={handleSend}
      className="border-t dark:border-gray-800 p-3 flex gap-2 items-end"
    >
      <textarea
        className="flex-1 resize-none border rounded-xl px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 max-h-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
        rows={1}
        placeholder="Message (Enter to send, Shift+Enter for newline)"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        maxLength={4000}
        disabled={sending}
      />
      <button
        type="submit"
        disabled={!content.trim() || sending}
        className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 disabled:opacity-40 shrink-0"
      >
        {sending ? '…' : 'Send'}
      </button>
    </form>
  );
}