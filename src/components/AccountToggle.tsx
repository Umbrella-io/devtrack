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

export default function AccountToggle() {
  const { selectedAccount, setSelectedAccount } = useAccount();
  const { data: session } = useSession();
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);

  useEffect(() => {
    async function loadAccounts() {
      try {
        const response = await fetch("/api/user/github-accounts");
        if (!response.ok) {
          setLinkedAccounts([]);
          return;
        }

        const data = (await response.json()) as AccountsResponse;
        setLinkedAccounts(
          (data.accounts ?? []).map((account) => ({
            githubId: account.githubId,
            githubLogin: account.githubLogin,
          }))
        );
      } catch {
        setLinkedAccounts([]);
      }
    }

    if (session?.githubLogin) {
      loadAccounts();
    }
  }, [session?.githubLogin]);

  if (!session?.githubLogin || linkedAccounts.length === 0) {
    return null;
  }

  const options: Array<{ label: string; value: string | null }> = [
    { label: session.githubLogin, value: null },
    ...linkedAccounts.map((account) => ({
      label: account.githubLogin,
      value: account.githubId,
    })),
    { label: "Combined", value: "combined" },
  ];

  return (
    <div
      className="mt-4 flex flex-wrap gap-2"
      role="group"
      aria-label="Select GitHub account"
    >
      {options.map((option) => {
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
