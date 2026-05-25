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

interface OrgPreference {
  login: string;
  included: boolean;
  public_repos: number;
  avatar_url: string;
  description: string | null;
}

interface OrgsResponse {
  orgs: OrgPreference[];
}

export default function AccountToggle() {
  const { selectedAccount, setSelectedAccount } = useAccount();
  const { data: session } = useSession();
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [showOrgsPanel, setShowOrgsPanel] = useState(false);
  const [orgs, setOrgs] = useState<OrgPreference[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);

  useEffect(() => {
    async function loadAccounts() {
      try {
        const response = await fetch("/api/user/github-accounts");
        if (!response.ok) {
          console.error("Failed to fetch linked accounts:", response.status);
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
      } catch (err) {
        console.error("Error loading linked accounts:", err);
        setLinkedAccounts([]);
      }
    }

    if (session?.githubLogin) {
      loadAccounts();
    }
  }, [session?.githubLogin]);

  useEffect(() => {
    async function loadOrgs() {
      if (!showOrgsPanel) return;

      setLoadingOrgs(true);
      try {
        const response = await fetch("/api/user/orgs");
        if (!response.ok) {
          console.error("Failed to fetch orgs:", response.status);
          setOrgs([]);
          return;
        }

        const data = (await response.json()) as OrgsResponse;
        setOrgs(data.orgs ?? []);
      } catch (err) {
        console.error("Error loading orgs:", err);
        setOrgs([]);
      } finally {
        setLoadingOrgs(false);
      }
    }

    loadOrgs();
  }, [showOrgsPanel]);

  const handleToggleOrg = async (orgName: string, included: boolean) => {
    try {
      const response = await fetch(`/api/user/orgs/${orgName}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ included }),
      });

      if (!response.ok) {
        console.error("Failed to toggle org preference:", response.status);
        return;
      }

      setOrgs(
        orgs.map((org) =>
          org.login === orgName ? { ...org, included } : org
        )
      );
    } catch (err) {
      console.error("Error toggling org preference:", err);
    }
  };

  const handleSelectOrg = (orgName: string | null) => {
    setSelectedOrg(orgName);
    setSelectedAccount(orgName ? `org:${orgName}` : null);
    setShowOrgsPanel(false);
  };

  if (!session?.githubLogin) {
    return null;
  }

  const hasLinkedAccounts = linkedAccounts.length > 0;
  const hasOrgs = orgs.length > 0;

  const accountOptions: Array<{ label: string; value: string | null }> = [
    { label: session.githubLogin, value: null },
    ...linkedAccounts.map((account) => ({
      label: account.githubLogin,
      value: account.githubId,
    })),
  ];

  if (hasLinkedAccounts || hasOrgs) {
    accountOptions.push({ label: "Combined", value: "combined" });
  }

  return (
    <div className="mt-4 flex flex-col gap-4">
      {/* Account Toggle Buttons */}
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Select GitHub account"
      >
        {accountOptions.map((option) => {
          const isActive = selectedAccount === option.value;

          return (
            <button
              key={`${option.label}-${option.value ?? "primary"}`}
              type="button"
              onClick={() => {
                setSelectedAccount(option.value);
                setShowOrgsPanel(false);
                setSelectedOrg(null);
              }}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]"
                  : "border-[var(--border)] bg-[var(--control)] text-[var(--card-foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {/* Organization Toggle Button */}
      {/* Always show org button to allow user to discover orgs */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowOrgsPanel(!showOrgsPanel)}
          className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            showOrgsPanel
              ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]"
              : "border-[var(--border)] bg-[var(--control)] text-[var(--card-foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
          }`}
        >
          Organizations {showOrgsPanel ? "✕" : "✓"}
        </button>
        {selectedOrg && (
          <span className="text-xs text-[var(--card-foreground)] italic">
            Viewing: {selectedOrg}
          </span>
        )}
      </div>

      {/* Organization Selection Panel */}
      {showOrgsPanel && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--control)] p-3">
          {loadingOrgs ? (
            <div className="text-sm text-[var(--card-foreground)]">
              Loading organizations...
            </div>
          ) : orgs.length === 0 ? (
            <div className="text-sm text-[var(--card-foreground)]">
              No organizations found. Make sure you have the org access permission enabled.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="mb-2 text-xs font-semibold text-[var(--card-foreground)] opacity-70">
                Select organization to view metrics
              </div>
              {orgs.map((org) => (
                <div
                  key={org.login}
                  className="flex items-center justify-between rounded border border-[var(--border)] bg-[var(--card)] p-2"
                >
                  <div
                    className="flex flex-1 cursor-pointer items-center gap-2"
                    onClick={() => handleSelectOrg(org.login)}
                  >
                    <img
                      src={org.avatar_url}
                      alt={org.login}
                      className="h-6 w-6 rounded-full"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-[var(--card-foreground)]">
                        {org.login}
                      </div>
                      {org.description && (
                        <div className="text-xs text-[var(--card-foreground)] opacity-70">
                          {org.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleOrg(org.login, !org.included);
                    }}
                    className={`rounded border px-2 py-1 text-xs font-medium transition-colors ${
                      org.included
                        ? "border-green-500 bg-green-500 text-white"
                        : "border-[var(--border)] bg-[var(--control)] text-[var(--card-foreground)]"
                    }`}
                  >
                    {org.included ? "Included" : "Excluded"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
