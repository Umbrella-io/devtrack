"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface ChallengeCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChallengeCreationModal({
  isOpen,
  onClose,
}: ChallengeCreationModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [metric, setMetric] = useState<"commits" | "prs">("commits");
  const [duration, setDuration] = useState<number>(7);
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setInviteLink(null);
      setError(null);
      setLoading(false);
      setMetric("commits");
      setDuration(7);
      setCopied(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metric, duration_days: duration }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create challenge");
      }
      const url = `${window.location.origin}/invite/${data.challenge.id}`;
      setInviteLink(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="challenge-modal-title"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl animate-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--card-muted)]/30 px-6 py-4">
          <h2 id="challenge-modal-title" className="text-lg font-bold">
            Issue a Challenge
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)]/10 hover:text-[var(--foreground)]"
            aria-label="Close modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {!inviteLink ? (
            <div className="space-y-5">
              <p className="text-sm text-[var(--muted-foreground)]">
                Challenge a friend or rival to a time-bound coding sprint. The winner gets a Victory Badge!
              </p>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Metric to track</label>
                <select
                  value={metric}
                  onChange={(e) => setMetric(e.target.value as "commits" | "prs")}
                  className="w-full rounded-xl border border-[var(--border)] bg-transparent p-3 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                >
                  <option value="commits" className="bg-[var(--card)]">Total Commits</option>
                  <option value="prs" className="bg-[var(--card)]">PRs Merged</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Duration (Days)</label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full rounded-xl border border-[var(--border)] bg-transparent p-3 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                >
                  <option value={3} className="bg-[var(--card)]">3 Days (Sprint)</option>
                  <option value={7} className="bg-[var(--card)]">7 Days (Weekly)</option>
                  <option value={14} className="bg-[var(--card)]">14 Days (Fortnight)</option>
                </select>
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <Button
                onClick={handleCreate}
                disabled={loading}
                className="w-full mt-2"
              >
                {loading ? "Generating..." : "Generate Invite Link"}
              </Button>
            </div>
          ) : (
            <div className="space-y-5 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <path d="M22 4L12 14.01l-3-3" />
                </svg>
              </div>
              <h3 className="text-lg font-bold">Challenge Created!</h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                Share this link with your rival. The challenge will begin as soon as they accept.
              </p>
              
              <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card-muted)]/30 p-2">
                <input
                  readOnly
                  value={inviteLink}
                  className="flex-1 bg-transparent px-2 text-sm text-[var(--foreground)] outline-none"
                />
                <Button onClick={handleCopy} variant="secondary" size="sm">
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
