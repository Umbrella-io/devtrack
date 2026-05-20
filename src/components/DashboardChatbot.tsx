"use client";

import React, { useState, useRef, useEffect } from "react";
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
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

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
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans antialiased text-slate-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-center w-14 h-14 rounded-full bg-slate-950 border border-blue-500/40 text-blue-400 hover:text-blue-300 transition-all duration-300 shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
          isOpen ? "rotate-90 scale-90 opacity-0 pointer-events-none" : "scale-100 opacity-100"
        }`}
        aria-label="Open AI Assistant"
      >
        <svg
           xmlns="http://www.w3.org/2000/svg"
           fill="none"
           viewBox="0 0 24 24"
           strokeWidth={1.8}
           stroke="currentColor"
           className="w-6 h-6 text-indigo-400 drop-shadow-[0_0_12px_rgba(99,102,241,0.8)]"
        >
         <circle cx="6" cy="12" r="2" />
         <circle cx="18" cy="6" r="2" />
         <circle cx="18" cy="18" r="2" />
         <path d="M8 12h8M8 12l8-6M8 12l8 6" />
        </svg>
      </button>

      <div
        className={`absolute bottom-0 right-0 w-[400px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-4rem)] flex flex-col rounded-2xl border border-slate-800 bg-slate-950/85 backdrop-blur-xl shadow-[0_0_40px_rgba(59,130,246,0.15)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] transform origin-bottom-right ${
          isOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4 pointer-events-none"
        }`}
      >
        <div className="absolute inset-0 rounded-2xl border border-blue-500/20 pointer-events-none shadow-[inset_0_0_15px_rgba(59,130,246,0.05)]" />

        <div className="relative flex items-center justify-between p-4 border-b border-slate-800/60 bg-slate-900/40 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-slate-900 border border-blue-500/30 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
              </svg>
              <span className="absolute bottom-[-1px] right-[-1px] flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold tracking-wide text-slate-100">DevTrack AI Assistant</h3>
            </div>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all focus:outline-none"
            aria-label="Minimize Chat"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
          {messages.map((msg) => {
            const isBot = msg.sender === "bot";
            return (
              <div key={msg.id} className={`flex ${isBot ? "justify-start" : "justify-end"} animate-fadeIn`}>
                <div
                  className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    isBot
                      ? "bg-slate-900/50 border border-slate-800/80 text-slate-300 rounded-tl-none font-mono text-[13px] backdrop-blur-sm shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
                      : "bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-tr-none font-sans shadow-[0_4px_12px_rgba(59,130,246,0.15)]"
                  }`}
                >
                  <div className="prose prose-invert prose-sm max-w-none break-words">
                    <ReactMarkdown>
                      {msg.text}
                    </ReactMarkdown>
                  </div>
                  <span className={`block text-[10px] mt-1.5 font-mono opacity-40 ${isBot ? "text-left" : "text-right"}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-xl rounded-tl-none border border-slate-800/80 bg-slate-900/50 px-3.5 py-2.5 text-[13px] font-mono text-blue-300">
                Thinking...
             </div>
           </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-slate-800/60 bg-slate-950/90 rounded-b-2xl">
          
          {inputValue.length < 5 && (
            <div className="grid grid-cols-2 gap-2 mb-3.5">
              {[
                "Explain my contribution streak",
                "Summarize my PR activity",
                "What are my top repositories?",
                "How can I improve consistency?"
              ].map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="rounded-xl border border-blue-500/20 bg-blue-950/20 px-3 py-2 text-left text-[11px] font-mono text-blue-300 transition-all duration-200 hover:border-blue-400/60 hover:bg-blue-900/40 hover:shadow-[0_0_12px_rgba(59,130,246,0.25)]"
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
              className="w-full h-10 pl-3.5 pr-12 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 text-sm font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 focus:shadow-[0_0_15px_rgba(59,130,246,0.15)] transition-all"
            />
            
            <button
              onClick={() => handleSendMessage(inputValue)}
              disabled={!inputValue.trim() || isLoading}
              className={`absolute right-1.5 flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200 ${
                inputValue.trim()
                  ? "bg-blue-600 text-white hover:bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                  : "bg-slate-800 text-slate-500 cursor-not-allowed"
              }`}
              aria-label="Submit Prompt"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}