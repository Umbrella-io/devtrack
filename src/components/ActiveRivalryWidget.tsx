"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface Challenge {
  id: string;
  metric: string;
  duration_days: number;
  status: string;
  creator_score?: number;
  opponent_score?: number;
  creator_start_metrics?: number;
  opponent_start_metrics?: number;
  end_time: string;
  creator: { github_login: string; name?: string };
  opponent: { github_login: string; name?: string };
  creator_id: string;
  opponent_id: string;
}

export default function ActiveRivalryWidget() {
  const { data: session } = useSession();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchChallenges() {
      try {
        const res = await fetch("/api/challenges");
        if (res.ok) {
          const data = await res.json();
          // filter to only active challenges for the widget
          setChallenges(data.challenges?.filter((c: Challenge) => c.status === "active") || []);
        }
      } catch (err) {
        console.error("Failed to fetch challenges", err);
      } finally {
        setLoading(false);
      }
    }
    if (session?.githubId) {
      fetchChallenges();
    }
  }, [session]);

  if (loading) return null;
  if (challenges.length === 0) return null;

  return (
    <div className="space-y-4">
      {challenges.map((c) => {
        const isCreator = c.creator.github_login === session?.githubLogin;
        const myScore = isCreator ? c.creator_score || 0 : c.opponent_score || 0;
        const opponentScore = isCreator ? c.opponent_score || 0 : c.creator_score || 0;
        const opponentName = isCreator ? c.opponent?.name || c.opponent?.github_login : c.creator?.name || c.creator?.github_login;
        const total = Math.max(1, myScore + opponentScore); // avoid div by 0
        const myPercentage = (myScore / total) * 100;

        const timeLeft = Math.max(0, new Date(c.end_time).getTime() - Date.now());
        const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));

        return (
          <Card key={c.id} className="overflow-hidden border border-emerald-500/20 bg-emerald-500/5 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold tracking-tight text-emerald-600 dark:text-emerald-400">
                  Active Rivalry vs {opponentName}
                </CardTitle>
                <span className="text-xs font-medium text-[var(--muted-foreground)]">
                  {daysLeft} days left
                </span>
              </div>
              <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider">
                Metric: {c.metric === "commits" ? "Total Commits" : "PRs Merged"}
              </p>
            </CardHeader>
            <CardContent>
              <div className="mt-2 space-y-3">
                <div className="flex items-center justify-between text-sm font-bold">
                  <span className={myScore >= opponentScore ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}>
                    You: {myScore}
                  </span>
                  <span className={opponentScore >= myScore ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}>
                    Them: {opponentScore}
                  </span>
                </div>
                {/* Tug of war bar */}
                <div className="relative h-3 w-full overflow-hidden rounded-full bg-[var(--card)] border border-[var(--border)]">
                  <div 
                    className="absolute bottom-0 left-0 top-0 bg-emerald-500 transition-all duration-500 ease-in-out"
                    style={{ width: `${myPercentage}%` }}
                  />
                  <div 
                    className="absolute bottom-0 right-0 top-0 bg-red-500 transition-all duration-500 ease-in-out"
                    style={{ width: `${100 - myPercentage}%` }}
                  />
                  {/* Center line marker */}
                  <div className="absolute bottom-0 left-1/2 top-0 w-px -translate-x-1/2 bg-[var(--background)]/50" />
                </div>
                {myScore > opponentScore && (
                  <p className="text-xs font-medium text-emerald-500 text-center">You are currently winning! 🏆</p>
                )}
                {opponentScore > myScore && (
                  <p className="text-xs font-medium text-red-500 text-center">You are falling behind! ⚠️</p>
                )}
                {myScore === opponentScore && (
                  <p className="text-xs font-medium text-[var(--muted-foreground)] text-center">It&apos;s a tie! ⚔️</p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
