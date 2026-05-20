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
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
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
          (chat: {
            id: string;
            role: "user" | "bot";
            message: string;
            created_at: string;
          }) => ({
            id: chat.id,
            sender: chat.role,
            text: chat.message,
            timestamp: new Date(chat.created_at),
          })
        );

        setMessages(formattedMessages);
      } catch {
        return;
      }
    }

    if (isOpen) {
      loadChatHistory();
    }
  }, [isOpen]);

  const handleSendMessage = async (textToSend: string) => {
    const trimmedText = textToSend.trim();
    if (!trimmedText || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: trimmedText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: trimmedText }),
      });

      const data = await response.json();

      const botMessage: Message = {
        id: `bot-${Date.now()}`,
        sender: "bot",
        text: response.ok
          ? data.reply
          : data.error || "Failed to get AI response.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch {
      const errorMessage: Message = {
        id: `bot-${Date.now()}`,
        sender: "bot",
        text: "Network error. Please try again.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendMessage(inputValue);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    inputRef.current?.focus();
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans antialiased text-slate-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex h-14 w-14 items-center justify-center rounded-full border border-blue-500/40 bg-slate-950 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all duration-300 hover:text-blue-300 hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
          isOpen
            ? "pointer-events-none rotate-90 scale-90 opacity-0"
            : "scale-100 opacity-100"
        }`}
        aria-label="Open AI Assistant"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.8}
          stroke="currentColor"
          className="h-6 w-6 text-indigo-400 drop-shadow-[0_0_12px_rgba(99,102,241,0.8)]"
        >
          <circle cx="6" cy="12" r="2" />
          <circle cx="18" cy="6" r="2" />
          <circle cx="18" cy="18" r="2" />
          <path d="M8 12h8M8 12l8-6M8 12l8 6" />
        </svg>
      </button>

      <div
        className={`absolute bottom-0 right-0 flex h-[600px] max-h-[calc(100vh-4rem)] w-[400px] max-w-[calc(100vw-2rem)] origin-bottom-right transform flex-col rounded-2xl border border-slate-800 bg-slate-950/85 shadow-[0_0_40px_rgba(59,130,246,0.15)] backdrop-blur-xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpen
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-4 scale-95 opacity-0"
        }`}
      >
        <div className="pointer-events-none absolute inset-0 rounded-2xl border border-blue-500/20 shadow-[inset_0_0_15px_rgba(59,130,246,0.05)]" />

        <div className="relative flex items-center justify-between rounded-t-2xl border-b border-slate-800/60 bg-slate-900/40 p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-blue-500/30 bg-slate-900 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5"
                />
              </svg>

              <span className="absolute bottom-[-1px] right-[-1px] flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
            </div>

            <div>
              <h3 className="text-sm font-semibold tracking-wide text-slate-100">
                DevTrack AI Assistant
              </h3>
            </div>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="rounded-md border border-transparent p-1.5 text-slate-400 transition-all hover:border-slate-800 hover:bg-slate-900 hover:text-slate-200 focus:outline-none"
            aria-label="Minimize Chat"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-5 w-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 8.25l-7.5 7.5-7.5-7.5"
              />
            </svg>
          </button>
        </div>

        <div className="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-800 flex-1 space-y-4 overflow-y-auto p-4">
          {messages.map((msg) => {
            const isBot = msg.sender === "bot";

            return (
              <div
                key={msg.id}
                className={`flex animate-fadeIn ${
                  isBot ? "justify-start" : "justify-end"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    isBot
                      ? "rounded-tl-none border border-slate-800/80 bg-slate-900/50 font-mono text-[13px] text-slate-300 shadow-[0_4px_12px_rgba(0,0,0,0.1)] backdrop-blur-sm"
                      : "rounded-tr-none bg-gradient-to-br from-blue-600 to-indigo-700 font-sans text-white shadow-[0_4px_12px_rgba(59,130,246,0.15)]"
                  }`}
                >
                  <div className="prose prose-invert prose-sm max-w-none break-words">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>

                  <span
                    className={`mt-1.5 block font-mono text-[10px] opacity-40 ${
                      isBot ? "text-left" : "text-right"
                    }`}
                  >
                    {msg.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-xl rounded-tl-none border border-slate-800/80 bg-slate-900/50 px-3.5 py-2.5 font-mono text-[13px] text-blue-300">
                Thinking...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="rounded-b-2xl border-t border-slate-800/60 bg-slate-950/90 p-4">
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
                  className="rounded-xl border border-blue-500/20 bg-blue-950/20 px-3 py-2 text-left font-mono text-[11px] text-blue-300 transition-all duration-200 hover:border-blue-400/60 hover:bg-blue-900/40 hover:shadow-[0_0_12px_rgba(59,130,246,0.25)]"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          <div className="relative flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask AI or query dashboard metrics..."
              className="h-10 w-full rounded-xl border border-slate-800 bg-slate-900 pl-3.5 pr-12 font-mono text-sm text-slate-200 placeholder-slate-500 transition-all focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/40 focus:shadow-[0_0_15px_rgba(59,130,246,0.15)]"
            />

            <button
              onClick={() => handleSendMessage(inputValue)}
              disabled={!inputValue.trim() || isLoading}
              className={`absolute right-1.5 flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-200 ${
                inputValue.trim()
                  ? "bg-blue-600 text-white shadow-[0_0_10px_rgba(59,130,246,0.3)] hover:bg-blue-500"
                  : "cursor-not-allowed bg-slate-800 text-slate-500"
              }`}
              aria-label="Submit Prompt"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="h-4 w-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}