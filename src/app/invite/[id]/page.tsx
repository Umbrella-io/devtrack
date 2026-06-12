import React from "react";
import { supabaseAdmin } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import AcceptChallengeButton from "@/components/AcceptChallengeButton";
import GithubSignInButton from "@/components/GithubSignInButton";

export default async function InvitePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  const { data: challenge, error } = await supabaseAdmin
    .from("challenges")
    .select("*, creator:users!challenges_creator_id_fkey(github_login, name)")
    .eq("id", params.id)
    .single();

  if (error || !challenge) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold">Challenge Not Found</h1>
          <p className="text-[var(--muted-foreground)]">This invite link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  const creatorName = challenge.creator?.name || challenge.creator?.github_login || "Someone";
  const metricName = challenge.metric === "commits" ? "Total Commits" : "PRs Merged";

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-xl text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </div>
        
        <h1 className="mb-2 text-2xl font-bold text-[var(--foreground)]">
          You&apos;ve been challenged!
        </h1>
        <p className="mb-8 text-[var(--muted-foreground)]">
          <strong>{creatorName}</strong> has challenged you to a <strong>{challenge.duration_days}-day sprint</strong> tracking <strong>{metricName}</strong>.
        </p>

        {challenge.status !== "pending" ? (
          <div className="rounded-xl bg-[var(--card-muted)] p-4 text-sm font-medium text-[var(--muted-foreground)]">
            This challenge is already active or has concluded.
          </div>
        ) : !session ? (
          <div className="space-y-4">
            <p className="text-sm font-medium text-amber-500">Sign in to accept this challenge:</p>
            <GithubSignInButton />
          </div>
        ) : session.user?.id === challenge.creator_id ? (
          <div className="rounded-xl bg-[var(--card-muted)] p-4 text-sm font-medium text-[var(--muted-foreground)]">
            You cannot accept your own challenge. Share this link with an opponent!
          </div>
        ) : (
          <AcceptChallengeButton challengeId={challenge.id} />
        )}
      </div>
    </div>
  );
}
