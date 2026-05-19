"use client";

import React, { useState, useEffect } from "react";

const Trophy = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7c0 6 6 8 6 8s6-2 6-8V2Z"/></svg>
);

const Loader2 = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);

const AlertCircle = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
);

export interface Contributor {
  id: string;
  username: string;
  avatar_url: string;
  streak_count: number;
  total_commits: number;
  rank: number;
}

export function useLeaderboard() {
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/leaderboard');
        if (!response.ok) throw new Error('Failed to fetch leaderboard data');
        
        const data = await response.json();
        const rankedData: Contributor[] = (data.contributors || []).map((user: any, index: number) => ({
          id: user.id,
          username: user.username,
          avatar_url: user.avatar_url,
          streak_count: user.streak_count,
          total_commits: user.total_commits,
          rank: user.rank || index + 1,
        }));

        setContributors(rankedData);
      } catch (err: unknown) {
        console.error("Leaderboard fetch error:", err);
        setError("Failed to fetch leaderboard data");
      } finally {
        setLoading(false);
      }
    }

    fetchLeaderboard();
  }, []);

  return { contributors, loading, error };
}

export default function LeaderboardPage() {
  const { contributors, loading, error } = useLeaderboard();

  // Helper arrays for explicit desktop spatial layout assignment [Rank 2, Rank 1, Rank 3]
  const topThree = contributors.slice(0, 3);
  const podiumOrder = topThree.length === 3 ? [topThree[1], topThree[0], topThree[2]] : topThree;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-16 font-sans selection:bg-indigo-500/20 antialiased">
      <div className="max-w-5xl mx-auto space-y-16">
        
        {/* Header Block */}
        <header className="space-y-3 max-w-xl animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-medium font-mono text-indigo-400 bg-indigo-500/5 border border-indigo-500/10 rounded-md">
            <Trophy className="w-3.5 h-3.5" /> METRICS-ENGINE
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white uppercase font-sans">
            System Core <span className="text-slate-400 font-light lowercase font-sans">Contributors</span>
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed font-sans">
            Real-time algorithmic indexing of project repository contributors based on consecutive daily streaks and absolute commit volume.
          </p>
        </header>

        {/* Sync Status Overlay */}
        {loading && (
          <div className="flex items-center gap-3 py-12 text-slate-400 font-mono text-xs tracking-wider uppercase">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
            <span>Parsing repository ledger indices...</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-950/10 border border-red-900/30 rounded-xl font-mono text-xs text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Structural Interface Elements */}
        {!loading && !error && contributors.length > 0 && (
          <div className="space-y-10">
            
            {/* Asymmetric Desktop Podium Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-6">
              {podiumOrder.map((user) => {
                const isFirst = user.rank === 1;
                return (
                  <div
                    key={user.id}
                    className={`relative w-full rounded-2xl transition-all duration-300 border backdrop-blur-md ${
                      isFirst
                        ? "bg-gradient-to-b from-white/[0.03] to-transparent border-indigo-500/20 md:scale-105 md:-translate-y-2 z-10 p-8 shadow-[0_32px_64px_-24px_rgba(0,0,0,0.8)]"
                        : "bg-white/[0.01] border-white/[0.04] p-6 z-0"
                    }`}
                  >
                    {/* Architectural Counter Badge */}
                    <div className="absolute top-4 right-4 font-mono font-bold text-xs text-slate-500 tracking-tighter">
                      [{user.rank.toString().padStart(2, "0")}]
                    </div>

                    <div className="flex flex-col items-center text-center space-y-5">
                      <div className="relative">
                        <img
                          src={user.avatar_url || "/api/placeholder/80/80"}
                          alt=""
                          className={`rounded-full object-cover bg-slate-900 border-2 ${
                            isFirst ? "w-20 h-20 border-indigo-500/30" : "w-16 h-16 border-slate-800"
                          }`}
                        />
                        {isFirst && (
                          <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded text-[10px] font-mono tracking-wider font-semibold text-indigo-400 uppercase">
                            Leader
                          </div>
                        )}
                      </div>

                      <div className="space-y-1 w-full">
                        <h3 className="text-base font-bold text-white truncate px-2 tracking-tight font-sans">
                          {user.username}
                        </h3>
                      </div>

                      {/* Monospace Metric Matrix Block */}
                      <div className="grid grid-cols-2 gap-2 w-full pt-2 border-t border-white/[0.03] font-mono text-xs">
                        <div className="text-left p-2 rounded bg-white/[0.01]">
                          <span className="block text-[10px] uppercase tracking-wider text-slate-500 mb-0.5 font-sans">Streak</span>
                          <span className="text-orange-400 font-bold tracking-tight">{user.streak_count}d</span>
                        </div>
                        <div className="text-left p-2 rounded bg-white/[0.01]">
                          <span className="block text-[10px] uppercase tracking-wider text-slate-500 mb-0.5 font-sans">Commits</span>
                          <span className="text-emerald-400 font-bold tracking-tight">{user.total_commits}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Industrial Ledger List View for Remaining Contributor Entries */}
            {contributors.length > 3 && (
              <div className="w-full bg-white/[0.01] border border-white/[0.03] rounded-2xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse font-mono text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.04] bg-white/[0.01] text-slate-500 uppercase tracking-wider">
                        <th className="p-4 pl-6 font-semibold w-20">Index</th>
                        <th className="p-4 font-semibold font-sans">Developer Entity</th>
                        <th className="p-4 font-semibold text-right w-32">Streak Metrics</th>
                        <th className="p-4 font-semibold text-right w-32 pr-6">Commit Volume</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                      {contributors.slice(3).map((user) => (
                        <tr key={user.id} className="group hover:bg-white/[0.01] transition-colors duration-150">
                          <td className="p-4 pl-6 text-slate-500 font-medium">
                            {user.rank.toString().padStart(2, "0")}
                          </td>
                          <td className="p-4 font-sans">
                            <div className="flex items-center gap-3">
                              <img
                                src={user.avatar_url || "/api/placeholder/32/32"}
                                alt=""
                                className="w-7 h-7 rounded-full bg-slate-900 border border-white/10"
                                loading="lazy"
                              />
                              <span className="font-bold text-slate-200 group-hover:text-white transition-colors font-sans">
                                {user.username}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-right font-bold text-orange-400/90 tracking-tight">
                            {user.streak_count}d
                          </td>
                          <td className="p-4 text-right font-bold text-emerald-400/90 tracking-tight pr-6">
                            {user.total_commits}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State Vector Block */}
        {!loading && !error && contributors.length === 0 && (
          <div className="text-center py-16 bg-white/[0.01] border border-white/[0.03] rounded-2xl font-mono text-xs text-slate-500">
            <span>Matrix structural index register is currently empty.</span>
          </div>
        )}
      </div>
    </div>
  );
}
