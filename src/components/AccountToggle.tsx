"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useAccount } from "@/components/AccountContext";

interface LinkedAccount {
  githubId: string;
  githubLogin: string;
}

interface AccountsResponse {
  accounts: Array<{
    githubId: string;
    githubLogin: string;
  }>;
}

interface OrgsResponse {
  accounts: Array<{
    githubId: string;
    githubLogin: string;
    orgs: Array<{
      id: number;
      login: string;
      avatarUrl: string;
    }>;
  }>;
  config: Record<string, boolean>;
}

export default function AccountToggle() {
  const { selectedAccount, setSelectedAccount } = useAccount();
  const { data: session } = useSession();
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [organizations, setOrganizations] = useState<Array<{ githubId: string; login: string }>>([]);

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

    loadAccounts();
  }, [session?.githubLogin]);

  useEffect(() => {
    async function loadOrgs() {
      try {
        const response = await fetch("/api/user/orgs");
        if (!response.ok) return;

        const data = await response.json();
        const config = data.config || {};
        
        // Gather all orgs across all accounts that are enabled (enabled !== false)
        const enabledOrgs: Array<{ githubId: string; login: string }> = [];
        (data.accounts || []).forEach((acc: any) => {
          (acc.orgs || []).forEach((org: any) => {
            if (config[org.login] !== false) {
              enabledOrgs.push({
                githubId: acc.githubId,
                login: org.login,
              });
            }
          });
        });
        setOrganizations(enabledOrgs);
      } catch (e) {
        console.error("Failed to load organizations in AccountToggle:", e);
      }
    }

    if (session?.githubLogin) {
      loadOrgs();
    }
  }, [session?.githubLogin]);

  if (!session?.githubLogin || (linkedAccounts.length === 0 && organizations.length === 0)) {
    return null;
  }

  const accountOptions: Array<{ label: string; value: string | null }> = [
    { label: session.githubLogin, value: null },
    ...linkedAccounts.map((account) => ({
      label: account.githubLogin,
      value: account.githubId,
    })),
    ...(linkedAccounts.length > 0 ? [{ label: "Combined", value: "combined" }] : []),
    ...organizations.map((org) => ({
      label: org.login,
      value: `org:${org.githubId}:${org.login}`,
    })),
  ];

  return (
    <div
      className="mt-4 flex flex-wrap gap-2"
      role="group"
      aria-label="Select GitHub account or organization"
    >
      {accountOptions.map((option) => {
        const isActive = selectedAccount === option.value;

        return (
          <button
            key={`${option.label}-${option.value ?? "primary"}`}
            type="button"
            aria-pressed={isActive}
            onClick={() => setSelectedAccount(option.value)}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]"
                : "border-[var(--card-muted)] bg-[var(--card-muted)] text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
