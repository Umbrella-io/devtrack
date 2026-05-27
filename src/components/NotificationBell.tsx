"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface Notification {
  id: string;
  type: string;
  message: string;
  read: boolean;
  created_at: string;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;

      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // silent fail
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    const handleNotifications = () => {
      fetchNotifications();
    };

    window.addEventListener("devtrack:notifications", handleNotifications);
    return () =>
      window.removeEventListener("devtrack:notifications", handleNotifications);
  }, [fetchNotifications]);

  // debounce searchQuery -> debouncedQuery
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 150);
    return () => clearTimeout(t);
  }, [searchQuery]);

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
        fetch("/api/notifications", { method: "PATCH" }).catch(() => {});
        setUnreadCount(0);
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, read: true }))
        );
      }

      return next;
    });
  }, [unreadCount]);

  // autofocus input when drawer opens
  useEffect(() => {
    if (open) {
      // focus after open render
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // memoize filtered notifications to avoid unnecessary work
  const filtered = useMemo(() => {
    if (!debouncedQuery) return notifications;

    const q = debouncedQuery.toLowerCase();

    return notifications.filter((n) => {
      const fields = [n.type, n.message, (n as any).title, (n as any).content, (n as any).repo];
      return fields.some((f) => typeof f === "string" && f.toLowerCase().includes(q));
    });
  }, [notifications, debouncedQuery]);

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

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        type="button"
        onClick={handleOpen}
        className="relative rounded-lg p-2 text-[var(--muted-foreground)] hover:bg-[var(--control)] hover:text-[var(--card-foreground)] transition-colors"
        aria-label={`Notifications — ${unreadCount} unread`}
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

      {/* dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xl z-50">
          <div className="flex flex-col gap-2 px-4 py-3 border-b border-[var(--border)]">
            <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--card-foreground)]">
              Notifications
            </h3>
            <div className="flex items-center gap-2">
              {unreadCount === 0 && (
                <span className="text-xs text-[var(--muted-foreground)]">
                  All caught up
                </span>
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

            {/* Search input */}
            <div className="relative">
              <label htmlFor="notification-search" className="sr-only">
                Search notifications
              </label>
              <input
                id="notification-search"
                ref={inputRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notifications"
                aria-label="Search notifications"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-1 text-sm text-[var(--card-foreground)] focus:outline-none"
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                  className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1 text-[var(--muted-foreground)] hover:bg-[var(--control)] hover:text-[var(--card-foreground)]"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          <ul className="max-h-72 overflow-y-auto divide-y divide-[var(--border)]  scrollbar-thin">
            {filtered.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-[var(--muted-foreground)]">
                {notifications.length === 0 && !debouncedQuery ? (
                  "No notifications yet"
                ) : (
                  <span>
                    No results for &quot;{debouncedQuery}&quot;
                  </span>
                )}
              </li>
            ) : (
              filtered.map((n) => (
                <li
                  key={n.id}
                  className={`px-4 py-3 ${
                    !n.read ? "bg-[var(--accent)]/5" : ""
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
        </div>
      )}
    </div>
  );
}
