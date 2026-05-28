"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import CopyLinkButton from "@/components/CopyLinkButton";

interface ShareProfileSectionProps {
  username: string;
  streak: number;
  profileUrl: string;
}

export default function ShareProfileSection({
  username,
  streak,
  profileUrl,
}: ShareProfileSectionProps) {
  const [canUseNativeShare, setCanUseNativeShare] = useState(false);

  useEffect(() => {
    setCanUseNativeShare(
      typeof navigator !== "undefined" &&
        "share" in navigator &&
        typeof window !== "undefined" &&
        window.matchMedia("(pointer: coarse)").matches
    );
  }, []);

  const shareText = `Check out my coding stats on DevTrack! 🔥 ${streak}-day streak`;
  const encodedText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(profileUrl);

  const xShareUrl = `https://x.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
  const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;

  const handleNativeShare = async () => {
    if (!navigator.share) return;

    try {
      await navigator.share({
        title: `${username}'s DevTrack Profile`,
        text: shareText,
        url: profileUrl,
      });
    } catch (error) {
      if ((error as DOMException).name !== "AbortError") {
        toast.error("Failed to open the share sheet");
      }
    }
  };

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm md:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--card-foreground)]">
            Share Profile
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
            Share your public stats on X, LinkedIn, or copy the profile link.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {canUseNativeShare ? (
            <button
              type="button"
              onClick={handleNativeShare}
              aria-label={`Share ${username}'s profile using the device share sheet`}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--accent)] px-3 py-2 text-sm font-medium text-[var(--accent-foreground)] transition-colors hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
            >
              <span aria-hidden="true">📲</span>
              <span>Share</span>
            </button>
          ) : null}

          <a
            href={xShareUrl}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={`Share ${username}'s profile on X`}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--control)] px-3 py-2 text-sm font-medium text-[var(--card-foreground)] transition-colors hover:bg-[var(--control)]/80 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
          >
            <span aria-hidden="true">𝕏</span>
            <span>X</span>
          </a>

          <a
            href={linkedInShareUrl}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={`Share ${username}'s profile on LinkedIn`}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--control)] px-3 py-2 text-sm font-medium text-[var(--card-foreground)] transition-colors hover:bg-[var(--control)]/80 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
          >
            <span aria-hidden="true">in</span>
            <span>LinkedIn</span>
          </a>

          <CopyLinkButton url={profileUrl} />
        </div>
      </div>
    </section>
  );
}