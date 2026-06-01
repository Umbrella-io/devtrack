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

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    // Lock background scrolling when modal is open
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const downloadQRCode = () => {
    const canvas = document.getElementById("profile-qr-canvas") as HTMLCanvasElement;
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
      {/* Backdrop with blur */}
      <div
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
              id="profile-qr-canvas"
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
