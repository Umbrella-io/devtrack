"use client";

import { useState } from "react";
import { Link2, Check } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

export default function ShareProfileButton() {
  const { data: session } = useSession();
  const [copied, setCopied] = useState(false);

  if (!session?.githubLogin) return null;

  const profileUrl = `https://devtrack-delta.vercel.app/u/${session.githubLogin}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      toast.success("Link copied!", {
        description: profileUrl,
        duration: 2000,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link", {
        description: "Please copy the URL manually from your browser.",
      });
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={`Copy profile link: ${profileUrl}`}
      className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--card-muted)]/50 px-3 py-2 text-xs font-semibold text-[var(--muted-foreground)] shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-[var(--accent)] hover:text-[var(--accent)] hover:scale-[1.03]"
      aria-label="Copy profile link"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-green-500" />
          <span className="text-green-500">Copied!</span>
        </>
      ) : (
        <>
          <Link2 className="h-3.5 w-3.5" />
          <span>Copy Link</span>
        </>
      )}
    </button>
  );
}