"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useAccount } from "@/components/AccountContext";

interface LinkedAccount {
  githubId: string;
  githubLogin: string;
}

interface OrgRecord {
  orgId: string;
  orgLogin: string;
  avatarUrl: string | null;
  includeInMetrics: boolean;
}

interface AccountsResponse {
  accounts: Array<{
    githubId: string;
    githubLogin: string;
  }>;
}

interface OrgsResponse {
  orgs: OrgRecord[];
  hasReadOrgScope: boolean;
}

export default function AccountToggle() {
  const { selectedAccount, setSelectedAccount } = useAccount();
  const { data: session } = useSession();
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [orgs, setOrgs] = useState<OrgRecord[]>([]);

  useEffect(() => {
    if (!session?.githubLogin) return;

    async function loadAccounts() {
      try {
        const response = await fetch("/api/user/github-accounts");
        if (!response.ok) {
          setLinkedAccounts([]);
          return;
        }
        const data = (await response.json()) as AccountsResponse;
        setLinkedAccounts(
          (data.accounts ?? []).map((a) => ({
            githubId: a.githubId,
            githubLogin: a.githubLogin,
          }))
        );
      } catch {
        setLinkedAccounts([]);
      }
    }

    async function loadOrgs() {
      try {
        const response = await fetch("/api/user/github-orgs");
        if (!response.ok) {
          setOrgs([]);
          return;
        }
        const data = (await response.json()) as OrgsResponse;
        // Only show orgs the user has chosen to include in metrics.
        setOrgs(
          (data.orgs ?? []).filter((o) => o.includeInMetrics)
        );
      } catch {
        setOrgs([]);
      }
    }

    loadAccounts();
    loadOrgs();
  }, [session?.githubLogin]);

  if (!session?.githubLogin) return null;

  const hasLinkedAccounts = linkedAccounts.length > 0;
  const hasOrgs = orgs.length > 0;

  // Render nothing if the user has neither linked accounts nor orgs
  if (!hasLinkedAccounts && !hasOrgs) return null;

  const accountOptions: Array<{ label: string; value: string | null }> = [
    { label: session.githubLogin, value: null },
    ...linkedAccounts.map((a) => ({ label: a.githubLogin, value: a.githubId })),
    ...(hasLinkedAccounts ? [{ label: "Combined", value: "combined" }] : []),
  ];

  const orgOptions: Array<{ label: string; value: string }> = orgs.map(
    (o) => ({ label: o.orgLogin, value: `org:${o.orgLogin}` })
  );

  const renderButton = (
    label: string,
    value: string | null,
    prefix?: string
  ) => {
    const isActive = selectedAccount === value;
    return (
      <button
        key={`${prefix ?? ""}${label}-${value ?? "primary"}`}
        type="button"
        aria-pressed={isActive}
        onClick={() => setSelectedAccount(value)}
        className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
          isActive
            ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]"
            : "border-[var(--card-muted)] bg-[var(--card-muted)] text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="mt-4 space-y-2">
      {hasLinkedAccounts && (
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Select GitHub account"
        >
          {accountOptions.map((o) => renderButton(o.label, o.value, "acct-"))}
        </div>
      )}

      {hasOrgs && (
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Filter by organization"
        >
          <span className="self-center text-xs text-[var(--muted-foreground)] mr-1">
            Orgs:
          </span>
          {orgOptions.map((o) => renderButton(o.label, o.value, "org-"))}
        </div>
      )}
    </div>
  );
}
