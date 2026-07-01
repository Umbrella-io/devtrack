"use client";

import { useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SyncButton() {
  const [isSyncing, setIsSyncing] = useState(false);
  const router = useRouter();

  const handleSync = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      router.refresh();
      await new Promise((res) => setTimeout(res, 1000));
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, router]);

  return (
    <button
      onClick={handleSync}
      disabled={isSyncing}
      title="Sync Data"
      className="transition-transform duration-200 hover:scale-[1.05] flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--card-muted)]/50 px-3 py-1.5 text-xs font-medium text-[var(--foreground)] shadow-sm backdrop-blur-sm disabled:cursor-not-allowed disabled:opacity-60"
    >
      <RefreshCw
        className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
      />
      <span>{isSyncing ? "Syncing\u2026" : "Sync Data"}</span>
    </button>
  );
}