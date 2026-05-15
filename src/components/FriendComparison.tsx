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
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--card-foreground)]">Friend Comparison</h2>
          <p className="text-sm text-[var(--muted-foreground)]">See how you stack up against others</p>
        </div>

        <form onSubmit={handleCompare} className="flex gap-2">
          <input
            type="text"
            placeholder="GitHub username..."
            value={friendUsername}
            onChange={(e) => setFriendUsername(e.target.value)}
            className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm outline-none focus:border-[var(--accent)]"
          />
          <button
            type="submit"
            disabled={loading || !friendUsername.trim()}
            className="rounded-md bg-[var(--accent)] px-4 py-1.5 text-sm font-medium text-[var(--accent-foreground)] disabled:opacity-50 transition-colors"
          >
            {loading ? "Loading..." : "Compare"}
          </button>
        </form>
      </div>

      {error && (
        <div className="p-4 mb-4 rounded-md bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError("")} className="hover:underline">Dismiss</button>
        </div>
      )}

      {friendData && myData && (
        <div className="space-y-4">
          <div className="flex justify-between items-center text-sm font-medium text-[var(--muted-foreground)] px-2">
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

          <div className="flex justify-end pt-4">
            <button
              onClick={clearComparison}
              className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
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
