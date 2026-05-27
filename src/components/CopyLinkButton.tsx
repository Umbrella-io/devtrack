"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Link, CheckCircle } from "lucide-react";

export default function CopyLinkButton() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Link copied successfully!");
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
      toast.error("Failed to copy link");
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
          <CheckCircle size={16} className="text-[var(--success)]" aria-hidden="true" />
          <span>Copied!</span>
        </>
      ) : (
        <>
          <Link size={16} aria-hidden="true" />
          <span>Copy link</span>
        </>
      )}
    </button>
  );
}
