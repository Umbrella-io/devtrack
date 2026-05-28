"use "use client"; // 💡 Required to use browser APIs and state

import { useState } from "react";
import { toast } from "sonner"; // Assuming sonner is installed as per tech context

export default function CopyLinkButton() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const profileUrl = window.location.href;

    // Graceful fallback logic for older browsers
    if (!navigator.clipboard) {
      // Fallback approach using a temporary textarea element
      const textArea = document.createElement("textarea");
      textArea.value = profileUrl;
      textArea.style.position = "fixed"; // Avoid scrolling to bottom
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      try {
        document.execCommand("copy");
        triggerSuccess();
      } catch (err) {
        toast.error("Failed to copy link. Please copy it from the address bar.");
      }

      document.body.removeChild(textArea);
      return;
    }

    // Modern browser logic
    try {
      await navigator.clipboard.writeText(profileUrl);
      triggerSuccess();
    } catch (err) {
      toast.error("Failed to copy link.");
    }
  };

  const triggerSuccess = () => {
    setCopied(true);
    toast.success("Link copied!", {
      duration: 2000, // ⏳ Shows toast for exactly 2 seconds
    });
    
    // Reset local state after 2 seconds
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
      title="Copy profile link"
    >
      {/* 📋 Visual state toggling */}
      {copied ? (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-600">Copied!</span>
        </>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
          <span>Copy Link</span>
        </>
      )}
    </button>
  );
}