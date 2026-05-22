"use client";

import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: Date;
}

export default function DashboardChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "bot",
      text: "Hello Developer. I'm DevTrack AI. I have indexed your repository metrics, PR history, and contribution streaks. How can I optimize your workflow today?",
      timestamp: new Date(),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  useEffect(() => {
    async function loadChatHistory() {
      try {
        const response = await fetch("/api/chatbot/history");
        const data = await response.json();

        if (!response.ok || !data.messages?.length) return;

        const formattedMessages: Message[] = data.messages.map(
          (chat: { id: string; role: "user" | "bot"; message: string; created_at: string }) => ({
            id: chat.id,
            sender: chat.role,
            text: chat.message,
            timestamp: new Date(chat.created_at),
          })
        );

        setMessages((prev) => {
          const withoutWelcome = prev.filter((msg) => msg.id !== "welcome");
          return [...withoutWelcome, ...formattedMessages];
        });
      } catch {
        return;
      }
    }

    if (isOpen) loadChatHistory();
  }, [isOpen]);

  const handleSendMessage = async (textToSend: string) => {
    const trimmedText = textToSend.trim();
    if (!trimmedText || isLoading) return;

    if (trimmedText.length > 2000) {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          sender: "bot",
          text: "Message too long. Maximum length is 2000 characters.",
          timestamp: new Date(),
        },
      ]);
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        sender: "user",
        text: trimmedText,
        timestamp: new Date(),
      },
    ]);

    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmedText }),
      });

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          sender: "bot",
          text: response.ok ? data.reply : data.error || "Failed to get AI response.",
          timestamp: new Date(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          sender: "bot",
          text: "Network error. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSendMessage(inputValue);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    inputRef.current?.focus();
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans antialiased text-[var(--foreground)]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex h-14 w-14 items-center justify-center rounded-full border border-[var(--accent)]/40 bg-[var(--card-muted)] text-[var(--accent)] shadow-[0_0_15px_var(--border)] transition-all duration-300 hover:shadow-[0_0_25px_var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 ${
          isOpen ? "pointer-events-none rotate-90 scale-90 opacity-0" : "scale-100 opacity-100"
        }`}
        aria-label="Open AI Assistant"
      >
        ✦
      </button>

      <div
        className={`absolute bottom-0 right-0 flex h-[600px] max-h-[calc(100vh-4rem)] w-[400px] max-w-[calc(100vw-2rem)] origin-bottom-right transform flex-col rounded-2xl border border-[var(--border)] bg-[var(--background)]/85 shadow-[0_0_40px_var(--border)] backdrop-blur-xl transition-all duration-300 ${
          isOpen ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-4 scale-95 opacity-0"
        }`}
      >
        <div className="relative flex items-center justify-between rounded-t-2xl border-b border-[var(--border)] bg-[var(--card-muted)]/40 p-4">
          <h3 className="text-sm font-semibold tracking-wide">DevTrack AI Assistant</h3>
          <button onClick={() => setIsOpen(false)} className="text-[var(--muted-foreground)]">
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.map((msg) => {
            const isBot = msg.sender === "bot";
            return (
              <div key={msg.id} className={`flex ${isBot ? "justify-start" : "justify-end"}`}>
                <div
                  className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm ${
                    isBot
                      ? "rounded-tl-none border border-[var(--border)] bg-[var(--card-muted)]/50 text-[var(--muted-foreground)]"
                      : "rounded-tr-none bg-[var(--accent)] text-[var(--foreground)]"
                  }`}
                >
                  <div className="prose prose-sm max-w-none break-words text-[var(--foreground)]">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                  <span className="mt-1.5 block text-[10px] opacity-60">
                    {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card-muted)]/50 px-3.5 py-2.5 text-sm text-[var(--accent)]">
              Thinking...
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="rounded-b-2xl border-t border-[var(--border)] bg-[var(--background)]/90 p-4">
          {inputValue.length < 5 && (
            <div className="mb-3.5 grid grid-cols-2 gap-2">
              {[
                "Explain my contribution streak",
                "Summarize my PR activity",
                "What are my top repositories?",
                "How can I improve consistency?",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="rounded-xl border border-[var(--accent)]/20 bg-[var(--card-muted)]/40 px-3 py-2 text-left text-[11px] text-[var(--accent)]"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          <div className="relative flex items-center">
            <input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask AI or query dashboard metrics..."
              className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--card-muted)] pl-3.5 pr-12 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none"
            />

            <button
              onClick={() => handleSendMessage(inputValue)}
              disabled={!inputValue.trim() || isLoading}
              className="absolute right-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              ↑
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}