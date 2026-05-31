"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";

const ComparisonChart = dynamic(() => import("./ComparisonChart"), { ssr: false });

interface CompareData {
  username: string;
  streak: number;
  commits30d: number;
  topLanguage: string;
  prs: number;
  weeklyCommits?: Array<{ week: string; commits: number }>;
  fromCache?: boolean;
}

interface SuggestedUser {
  username: string;
  avatarUrl: string;
}

const STORAGE_KEY = "devtrack:compare_username";
const SUGGEST_DEBOUNCE_MS = 300;

export default function FriendComparison() {
  const [friendUsername, setFriendUsername] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(STORAGE_KEY) ?? "";
  });
  const [comparingUser, setComparingUser] = useState("");
  const [myData, setMyData] = useState<CompareData | null>(null);
  const [friendData, setFriendData] = useState<CompareData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [suggestQuery, setSuggestQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suppressNextSuggestFetch, setSuppressNextSuggestFetch] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const trimmedFriendUsername = useMemo(() => friendUsername.trim(), [friendUsername]);

  // Fetch my data on mount
  useEffect(() => {
    fetch("/api/metrics/compare?username=me")
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) setMyData(data);
      })
      .catch(() => {});
  }, []);

  // Auto-compare persisted username on mount
  useEffect(() => {
    const persisted = localStorage.getItem(STORAGE_KEY);
    if (persisted) {
      runCompare(persisted);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce search input for suggestions
  useEffect(() => {
    const timer = setTimeout(() => setSuggestQuery(friendUsername), SUGGEST_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [friendUsername]);

  // Fetch suggestions
  useEffect(() => {
    const q = suggestQuery.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setSuggestOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (suppressNextSuggestFetch) {
      setSuppressNextSuggestFetch(false);
      return;
    }

    let cancelled = false;
    setSuggestLoading(true);

    fetch(`/api/users/search?q=${encodeURIComponent(q)}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const users = Array.isArray(data?.users) ? (data.users as SuggestedUser[]) : [];
        setSuggestions(users);
        setSuggestOpen(users.length > 0);
        setActiveIndex(-1);
      })
      .catch(() => {
        if (cancelled) return;
        setSuggestions([]);
        setSuggestOpen(false);
        setActiveIndex(-1);
      })
      .finally(() => {
        if (cancelled) return;
        setSuggestLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [suggestQuery, suppressNextSuggestFetch]);

  // Close suggestions on outside click
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;
      if (e.target instanceof Node && container.contains(e.target)) return;
      setSuggestOpen(false);
      setActiveIndex(-1);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const chooseSuggestion = (user: SuggestedUser) => {
    setFriendUsername(user.username);
    setSuppressNextSuggestFetch(true);
    setSuggestions([]);
    setSuggestOpen(false);
    setActiveIndex(-1);
  };

  async function runCompare(target: string) {
    const trimmed = target.trim();
    if (!trimmed) return;

    setLoading(true);
    setError("");
    setFriendData(null);
    setComparingUser(trimmed);
    setSuggestOpen(false);
    setActiveIndex(-1);

    try {
      const res = await fetch(`/api/metrics/compare?username=${encodeURIComponent(trimmed)}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to fetch user");
      } else {
        setFriendData(data);
        localStorage.setItem(STORAGE_KEY, trimmed);
        window.dispatchEvent(
          new CustomEvent("devtrack:compare-user", {
            detail: { username: trimmed },
          })
        );
      }
    } catch {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  const handleCompare = async (e: React.FormEvent) => {
    e.preventDefault();
    await runCompare(trimmedFriendUsername);
  };

  const clearComparison = () => {
    setFriendUsername("");
    setComparingUser("");
    setFriendData(null);
    setError("");
    setSuggestions([]);
    setSuggestOpen(false);
    setActiveIndex(-1);
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("devtrack:clear-compare-user"));
  };

  const handleCommitActivityClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const element = document.getElementById("contribution-activity");
    if (element) {
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - 100;
      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
    }
  };

  return (
    <div className="w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-6 shadow-sm">
      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[var(--card-foreground)]">
            Friend Comparison
          </h2>
        </div>

        <p className="text-sm text-[var(--muted-foreground)]">
          See how you stack up against others
        </p>

        <form
          onSubmit={handleCompare}
          className="flex flex-col sm:flex-row gap-2 w-full"
        >
          <div ref={containerRef} className="relative min-w-0 flex-1">
            <input
              type="text"
              role="combobox"
              placeholder="GitHub username..."
              value={friendUsername}
              onChange={(e) => setFriendUsername(e.target.value)}
              onFocus={() => {
                if (suggestions.length > 0) setSuggestOpen(true);
              }}
              onKeyDown={(e) => {
                if (!suggestOpen || suggestions.length === 0) return;

                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActiveIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActiveIndex((prev) => Math.max(prev - 1, 0));
                } else if (e.key === "Enter") {
                  if (activeIndex >= 0 && activeIndex < suggestions.length) {
                    e.preventDefault();
                    chooseSuggestion(suggestions[activeIndex]);
                  }
                } else if (e.key === "Escape") {
                  setSuggestOpen(false);
                  setActiveIndex(-1);
                }
              }}
              aria-autocomplete="list"
              aria-expanded={suggestOpen}
              aria-controls="friend-compare-suggestions"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />

            {suggestOpen && suggestions.length > 0 && (
              <div
                id="friend-compare-suggestions"
                role="listbox"
                className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-[var(--border)] bg-[var(--card)] shadow-lg"
              >
                {suggestions.map((u, idx) => (
                  <button
                    key={u.username}
                    type="button"
                    role="option"
                    aria-selected={idx === activeIndex}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => chooseSuggestion(u)}
                    className={[
                      "flex w-full items-center gap-2 px-3 py-2 text-left text-sm",
                      idx === activeIndex
                        ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                        : "hover:bg-[var(--control)]",
                    ].join(" ")}
                  >
                    <Image
                      src={u.avatarUrl}
                      alt={`${u.username} avatar`}
                      width={20}
                      height={20}
                      className="h-5 w-5 rounded-full"
                      loading="lazy"
                    />
                    <span className="truncate">{u.username}</span>
                  </button>
                ))}

                {suggestLoading && (
                  <div className="px-3 py-2 text-xs text-[var(--muted-foreground)]">
                    Loading…
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !trimmedFriendUsername}
            className="w-full sm:w-auto shrink-0 whitespace-nowrap rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] transition-colors disabled:opacity-50 hover:opacity-90"
          >
            {loading ? "Loading..." : "Compare"}
          </button>
        </form>
      </div>

      {error && (
        <div className="p-4 mb-4 rounded-md border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 text-[var(--destructive)] text-sm flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError("")} className="hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Skeleton loader */}
      {loading && (
        <div className="animate-pulse space-y-2 mt-2" aria-busy="true" aria-label="Loading comparison">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 rounded-lg bg-[var(--control)]"
            >
              <div className="h-4 w-16 rounded bg-[var(--border)]" />
              <div className="h-3 w-20 rounded bg-[var(--border)]" />
              <div className="h-4 w-16 rounded bg-[var(--border)]" />
            </div>
          ))}
          <div className="h-48 rounded-xl bg-[var(--control)] mt-4" />
        </div>
      )}

      {friendData && myData && !loading && (
        <div className="space-y-4">
          {friendData.fromCache && (
            <p className="text-xs text-[var(--muted-foreground)] text-right">
              Cached result for today
            </p>
          )}

          <div className="overflow-x-auto pb-2 scrollbar-thin">
            <div className="min-w-[400px]">
              <div className="flex justify-between items-center text-sm font-medium text-[var(--muted-foreground)] px-2 mb-4">
                <div className="w-1/3 text-left">You ({myData.username})</div>
                <div className="w-1/3 text-center uppercase tracking-wider text-xs">Metric</div>
                <div className="w-1/3 text-right">Them ({friendData.username})</div>
              </div>

              <div className="space-y-2">
                <ComparisonRow
                  label="Current Streak"
                  myValue={myData.streak}
                  theirValue={friendData.streak}
                  suffix=" days"
                />
                <ComparisonRow
                  label="Commits (30d)"
                  myValue={myData.commits30d}
                  theirValue={friendData.commits30d}
                />
                <ComparisonRow
                  label="Pull Requests"
                  myValue={myData.prs}
                  theirValue={friendData.prs}
                />
                <ComparisonRow
                  label="Top Language"
                  myValue={myData.topLanguage}
                  theirValue={friendData.topLanguage}
                  isString
                />
              </div>
            </div>
          </div>

          {/* Chart overlay — only renders when both have weekly data */}
          {myData.weeklyCommits && friendData.weeklyCommits && (
            <ComparisonChart
              myUsername={myData.username}
              friendUsername={friendData.username}
              myWeeklyCommits={myData.weeklyCommits}
              friendWeeklyCommits={friendData.weeklyCommits}
            />
          )}

          <div className="flex flex-col sm:flex-row justify-center items-stretch sm:items-center gap-3 pt-4">
            <a
              href="#contribution-activity"
              onClick={handleCommitActivityClick}
              className="text-center rounded-full bg-[var(--control)] px-4 py-2 text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
            >
              View Commit Activity
            </a>
            <button
              onClick={clearComparison}
              className="rounded-full bg-[var(--control)] px-4 py-2 text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--destructive)]/10 hover:text-[var(--destructive)]"
            >
              Clear Comparison
            </button>
          </div>
        </div>
      )}

      {!friendData && !loading && !error && (
        <div className="flex items-center justify-center h-32 border-2 border-dashed border-[var(--border)] rounded-lg text-[var(--muted-foreground)] text-sm">
          Enter a username above to start comparing
        </div>
      )}
    </div>
  );
}

function ComparisonRow({
  label,
  myValue,
  theirValue,
  suffix = "",
  isString = false,
}: {
  label: string;
  myValue: string | number;
  theirValue: string | number;
  suffix?: string;
  isString?: boolean;
}) {
  let myWin = false;
  let theirWin = false;

  if (!isString) {
    if (Number(myValue) > Number(theirValue)) myWin = true;
    if (Number(theirValue) > Number(myValue)) theirWin = true;
  }

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--control)]">
      <div
        className={`w-1/3 text-left font-medium ${
          myWin ? "text-[var(--accent)]" : "text-[var(--foreground)]"
        }`}
      >
        {myValue}
        {suffix}
      </div>
      <div className="w-1/3 text-center text-xs text-[var(--muted-foreground)] font-medium">
        {label}
      </div>
      <div
        className={`w-1/3 text-right font-medium ${
          theirWin ? "text-[var(--accent)]" : "text-[var(--foreground)]"
        }`}
      >
        {theirValue}
        {suffix}
      </div>
    </div>
  );
}
