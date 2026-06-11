"use client";

import React, { useEffect, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { X, Download, QrCode } from "lucide-react";

interface ProfileQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  profileUrl: string;
}

export default function ProfileQrModal({
  isOpen,
  onClose,
  username,
  profileUrl,
}: ProfileQrModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const downloadButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Tab") {
        const focusable = [closeButtonRef.current, downloadButtonRef.current].filter(Boolean) as HTMLElement[];
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            last.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    
    // Save original active element to restore focus on close
    const originalActiveElement = document.activeElement as HTMLElement | null;
    
    // Shift initial focus to close button for screen readers
    setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    // Lock background scrolling while preserving original overflow (assumes single modal stack)
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
      originalActiveElement?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const downloadQRCode = () => {
    const canvas = modalRef.current?.querySelector("canvas");
    if (!canvas) return;

    try {
      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `${username}-devtrack-qr.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } catch (error) {
      console.error("Failed to download QR code:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      {/* Backdrop with blur and stable test-id */}
      <div
        data-testid="qr-modal-backdrop"
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-modal-title"
        className="relative w-full max-w-sm transform overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl transition-all animate-in zoom-in-95 duration-200 text-center"
      >
        {/* Close Button */}
        <button
          ref={closeButtonRef}
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 rounded-lg p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--control)] transition-all focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="flex flex-col items-center gap-1.5 mt-2">
          <div className="flex items-center gap-2">
            <QrCode className="text-[var(--accent)]" size={22} aria-hidden="true" />
            <h3 id="qr-modal-title" className="text-lg font-bold text-[var(--foreground)]">
              Share Profile QR
            </h3>
          </div>
          <p className="text-xs text-[var(--muted-foreground)] px-2">
            Scan with a phone camera to quickly view @{username}&apos;s profile on DevTrack.
          </p>
        </div>

        {/* QR Code Container (High Contrast for reliable scanning in all modes) */}
        <div className="my-6 flex justify-center">
          <div className="rounded-2xl bg-white p-4 shadow-md border border-gray-100 flex items-center justify-center">
            <QRCodeCanvas
              value={profileUrl}
              size={200}
              level="H"
              includeMargin={false}
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="flex flex-col gap-2">
          <button
            ref={downloadButtonRef}
            type="button"
            onClick={downloadQRCode}
            className="w-full rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--accent-foreground)] transition-all hover:opacity-90 active:scale-95 shadow-lg shadow-[var(--accent)]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] flex items-center justify-center gap-2"
          >
            <Download size={16} aria-hidden="true" />
            <span>Download QR Code</span>
          </button>
        </div>
      </div>
    </div>
  );
}
