"use client";

import { useState, useEffect } from "react";

interface CompareData {
  username: string;
  streak: number;
  commits30d: number;
  topLanguage: string;
  prs: number;
}

export default function FriendComparison() {
  const [friendUsername, setFriendUsername] = useState("");
  const [comparingUser, setComparingUser] = useState("");
  const [myData, setMyData] = useState<CompareData | null>(null);
  const [friendData, setFriendData] = useState<CompareData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch my data on mount
  useEffect(() => {
    fetch("/api/metrics/compare?username=me")
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) setMyData(data);
      })
      .catch(() => {});
  }, []);

  const handleCompare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendUsername.trim()) return;

    setLoading(true);
    setError("");
    setFriendData(null);
    setComparingUser(friendUsername.trim());

    try {
      const res = await fetch(`/api/metrics/compare?username=${encodeURIComponent(friendUsername.trim())}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to fetch user");
      } else {
        setFriendData(data);
        window.dispatchEvent(
          new CustomEvent("devtrack:compare-user", {
            detail: { username: friendUsername.trim() },
          })
        );
      }
    } catch (err) {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const clearComparison = () => {
    setFriendUsername("");
    setComparingUser("");
    setFriendData(null);
    setError("");
    window.dispatchEvent(new CustomEvent("devtrack:clear-compare-user"));
  };

  const handleCommitActivityClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const element = document.getElementById("contribution-activity");
    if (element) {
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - 100;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
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
        <input
          type="text"
          placeholder="GitHub username..."
          value={friendUsername}
          onChange={(e) => setFriendUsername(e.target.value)}
          className="min-w-0 flex-1 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />

        <button
          type="submit"
          disabled={loading || !friendUsername.trim()}
          className="w-full sm:w-auto shrink-0 whitespace-nowrap rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] transition-colors disabled:opacity-50 hover:opacity-90"
        >
          {loading ? "Loading..." : "Compare"}
        </button>
      </form>
    </div>

      {error && (
        <div className="p-4 mb-4 rounded-md border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 text-[var(--destructive)] text-sm flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError("")} className="hover:underline">Dismiss</button>
        </div>
      )}

      {friendData && myData && (
        <div className="space-y-4">
          <div className="overflow-x-auto pb-2">
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

          <div className="flex justify-center items-center gap-3 pt-4">
            <a
              href="#contribution-activity"
              onClick={handleCommitActivityClick}
              className="rounded-full bg-[var(--control)] px-4 py-2 text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
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
  isString = false
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
      <div className={`w-1/3 text-left font-medium ${myWin ? "text-[var(--accent)]" : "text-[var(--foreground)]"}`}>
        {myValue}{suffix}
      </div>
      <div className="w-1/3 text-center text-xs text-[var(--muted-foreground)] font-medium">
        {label}
      </div>
      <div className={`w-1/3 text-right font-medium ${theirWin ? "text-[var(--accent)]" : "text-[var(--foreground)]"}`}>
        {theirValue}{suffix}
      </div>
    </div>
  );
}