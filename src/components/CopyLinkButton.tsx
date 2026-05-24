"use client";

import { useState } from "react";

export default function CopyLinkButton() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label="Copy profile link"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--control)] border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--accent)] rounded-lg text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 active:scale-[0.98]"
    >
      {copied ? (
        <>
          <span className="text-[var(--success)] font-semibold">✓</span>
          <span>Copied!</span>
        </>
      ) : (
        <>
          <span>🔗</span>
          <span>Copy link</span>
        </>
      )}
    </button>
  );
}
