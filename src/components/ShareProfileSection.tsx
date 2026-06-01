"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import CopyLinkButton from "@/components/CopyLinkButton";
import { toPng } from "html-to-image";
import ProfileShareCard from "./ProfileShareCard";

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
  const cardRef = useRef<HTMLDivElement>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    setCanUseNativeShare(
      typeof navigator !== "undefined" &&
        "share" in navigator
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
  
  const downloadCard = async () => {
    if (!cardRef.current) return;
  
    try {
      const dataUrl = await toPng(cardRef.current);
  
      const link = document.createElement("a");
      link.download = `${username}-devtrack-card.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      toast.error("Failed to download card");
    }
  };

return (
  <>
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

        <button
          type="button"
          onClick={() => setShowPreview(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--control)] px-3 py-2 text-sm font-medium"
        >
          Generate Share Card
        </button>

        <div className="flex flex-wrap gap-2">
          {canUseNativeShare ? (
            <button
              type="button"
              onClick={handleNativeShare}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--accent)] px-3 py-2 text-sm font-medium text-[var(--accent-foreground)]"
            >
              <span>📲</span>
              <span>Share</span>
            </button>
          ) : null}
        
          <a
            href={xShareUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--control)] px-3 py-2 text-sm font-medium"
          >
            <span>𝕏</span>
            <span>X</span>
          </a>
        
          <a
            href={linkedInShareUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--control)] px-3 py-2 text-sm font-medium"
          >
            <span>in</span>
            <span>LinkedIn</span>
          </a>
        
          <CopyLinkButton url={profileUrl} />
        </div>
      </div>
    </section>

    {showPreview && (
      <div className="mt-4 rounded-xl border p-4">
        <div ref={cardRef}>
          <ProfileShareCard
            username={username}
            streak={streak}
            profileUrl={profileUrl}
          />
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={downloadCard}
            className="rounded-lg border px-3 py-2"
          >
            Download PNG
          </button>

          <button
            type="button"
            onClick={() => setShowPreview(false)}
            className="rounded-lg border px-3 py-2"
          >
            Close
          </button>
        </div>
      </div>
    )}
  </>
);
}