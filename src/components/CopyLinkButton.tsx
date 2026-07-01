"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

interface CopyLinkButtonProps {
  url: string;
  label?: string;
}

export default function CopyLinkButton({ url, label = "Copy link" }: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (copied) return;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      } else {
        const el = document.createElement("textarea");
        el.value = url;
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      }
      setCopied(true);
      toast.success("Link copied!", { duration: 2000 });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link.");
    }
  };

  return (
    <button
      onClick={handleCopy}
      type="button"
      aria-label={copied ? "Copied!" : label}
      title={copied ? "Copied!" : label}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border shadow-sm
        focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none
        transition-all duration-200 active:scale-95
        ${
          copied
            ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-600 scale-105"
            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
        }`}
    >
      <span
        className={`transition-transform duration-200 ${
          copied ? "scale-110" : "scale-100"
        }`}
      >
        {copied ? (
          <Check size={13} className="text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        ) : (
          <Copy size={13} aria-hidden="true" />
        )}
      </span>
      <span>{copied ? "Copied!" : label}</span>
    </button>
  );
}