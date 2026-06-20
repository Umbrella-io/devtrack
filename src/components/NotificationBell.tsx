"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";


import { useNotifications } from "@/hooks/useNotifications";

const EMPTY_NOTIFICATIONS: any[] = [];

export default function NotificationBell() {
  const { data, loading, error, refetch } = useNotifications();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);


  const notifications = data?.notifications ?? EMPTY_NOTIFICATIONS;
  const unreadCountFromApi = data?.unreadCount ?? 0;

  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    setUnreadCount(unreadCountFromApi);
  }, [unreadCountFromApi]);

  const [open, setOpen] = useState(false);

  // Recompute anchor position whenever the dropdown opens or window resizes
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const calculate = () => {
      const rect = triggerRef.current!.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    };
    calculate();
    window.addEventListener("resize", calculate);
    window.addEventListener("scroll", calculate, true);
    return () => {
      window.removeEventListener("resize", calculate);
      window.removeEventListener("scroll", calculate, true);
    };
  }, [open]);



  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("devtrack:unread-notification-count");
      if (stored !== null) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed >= 0) {
          setUnreadCount(parsed);
        }
      }
    }

    const handleNotifications = () => {
      void refetch();
    };

    // initial load
    void refetch();

    window.addEventListener("devtrack:notifications", handleNotifications);

    return () =>
      window.removeEventListener("devtrack:notifications", handleNotifications);
  }, [refetch]);


  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handleClickOutside);
    return () =>
      document.removeEventListener("pointerdown", handleClickOutside);
  }, []);

  const handleOpen = useCallback(async () => {

    setOpen((prev) => {
      const next = !prev;

      if (!prev && unreadCount > 0) {
        const previousUnreadCount = unreadCount;
        const previousNotifications = notifications;

        setUnreadCount(0);
        if (typeof window !== "undefined") {
          localStorage.setItem("devtrack:unread-notification-count", "0");
        }
        fetch("/api/notifications", { method: "PATCH" }).catch(() => {
          setUnreadCount(previousUnreadCount);
          // data will be revalidated by the hook
          if (typeof window !== "undefined") {
            localStorage.setItem(
              "devtrack:unread-notification-count",
              previousUnreadCount.toString()
            );
          }
        }).finally(() => {
          void refetch();
        });

      }

      return next;
    });
  }, [notifications, unreadCount, refetch]);

  function timeAgo(iso: string): string {
    const mins = Math.floor(
      (Date.now() - new Date(iso).getTime()) / 60000
    );

    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;

    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;

    return `${Math.floor(hrs / 24)}d ago`;
  }

  const [clearing, setClearing] = useState(false);

  const handleClearAll = useCallback(async () => {
    if (clearing || notifications.length === 0) return;

    setClearing(true);
    try {
      const res = await fetch("/api/notifications", { method: "DELETE" });
      if (!res.ok) throw new Error(`Failed to clear notifications (${res.status})`);

      setUnreadCount(0);
      if (typeof window !== "undefined") {
        localStorage.setItem("devtrack:unread-notification-count", "0");
      }
    } catch (e) {
      console.error("Failed to clear notifications:", e);
    } finally {
      setClearing(false);
      void refetch();
    }
  }, [clearing, notifications.length, refetch]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dynamic announcement live region */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {unreadCount > 0 ? `${unreadCount} unread notifications` : "No unread notifications"}
      </div>

      {/* Bell button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className="relative rounded-lg p-2 text-[var(--muted-foreground)] hover:bg-[var(--control)] hover:text-[var(--card-foreground)] transition-all hover:opacity-90 active:scale-95"
        aria-label="Notifications"
        title="Notifications"
        suppressHydrationWarning
      >
        {/* icon */}
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {/* badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--accent)] text-[9px] font-bold text-[var(--accent-foreground)]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* dropdown via portal so it escapes overflow:hidden ancestors */}
      {open && mounted && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: "fixed",
            top: dropdownPos?.top ?? 64,
            right: dropdownPos?.right ?? 16,
            zIndex: 9999,
            width: 320,
          }}
          className="rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xl"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <h3 className="text-sm font-semibold text-[var(--card-foreground)]">
              Notifications
            </h3>
            <div className="flex items-center gap-2">
              {unreadCount === 0 && (
                <span className="text-xs text-[var(--muted-foreground)]">
                  All caught up
                </span>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  disabled={clearing}
                  className="text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--card-foreground)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Clear all notifications"
                  title="Clear all notifications"
                >
                  {clearing ? "Clearing…" : "Clear all"}
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-[var(--muted-foreground)] hover:bg-[var(--control)] hover:text-[var(--card-foreground)] transition-colors"
                aria-label="Close notifications"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
          </div>

          <ul className="max-h-72 overflow-y-auto divide-y divide-[var(--border)] scrollbar-thin">
            {loading ? (
              <li className="px-4 py-6 text-center text-sm text-[var(--muted-foreground)]">
                Loading notifications…
              </li>
            ) : error ? (
              <li className="px-4 py-6 text-center text-sm text-[var(--destructive)]">
                {error.message}
              </li>
            ) : notifications.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-[var(--muted-foreground)]">
                No notifications yet
              </li>
            ) : (
              notifications.map((n) => (
                <li
                  key={n.id}
                  className={`px-4 py-3 ${!n.read ? "bg-[var(--accent)]/5" : ""
                    }`}
                >
                  <p className="text-sm text-[var(--card-foreground)]">
                    {n.message}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                    {timeAgo(n.created_at)}
                  </p>
                </li>
              ))
            )}
          </ul>
        </div>,
        document.body
      )}
    </div>
  );
}