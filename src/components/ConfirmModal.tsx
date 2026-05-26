"use client";

import { useEffect, useRef } from "react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    // Lock scroll
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onCancel}
      />
      
      {/* Modal Content */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md transform overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl transition-all animate-in fade-in zoom-in duration-200"
      >
        <div className="mb-4">
          <h3 className="text-lg font-bold text-[var(--foreground)]">
            {title}
          </h3>
          <p className="mt-2 text-sm text-[var(--muted-foreground)] leading-relaxed">
            {message}
          </p>
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto rounded-xl border border-[var(--border)] bg-[var(--control)] px-5 py-2.5 text-sm font-semibold text-[var(--card-foreground)] transition-all hover:bg-[var(--card-muted)] active:scale-95 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="w-full sm:w-auto rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[var(--accent-foreground)] transition-all hover:opacity-90 active:scale-95 shadow-lg shadow-[var(--accent)]/20 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
