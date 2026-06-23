"use client";

export default function PrintProfileButton() {
    return (
        <button
            onClick={() => window.print()}
            className="print:hidden inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--control)] px-3 py-1.5 text-xs font-medium text-[var(--card-foreground)] transition-colors hover:text-[var(--accent)] hover:border-[var(--accent)]"
            aria-label="Export profile as PDF"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
            >
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
            </svg>
            Export / Print PDF
        </button>
    );
}