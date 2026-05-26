"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useHeatmapTheme } from "@/hooks/useHeatmapTheme";
import PrivacySettings from "@/components/PrivacySettings";
import { toast } from "sonner";

interface UserSettings {
  id: string;
  github_login: string;
  is_public: boolean;
  leaderboard_opt_in: boolean;
  has_wakatime_key?: boolean;
}

interface LinkedAccount {
  id: string;
  githubId: string;
  githubLogin: string;
  addedAt: string;
}

interface AccountsResponse {
  accounts: LinkedAccount[];
}

function formatAddedDate(addedAt: string): string {
  return `Added ${new Date(addedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

function getStatusMessage(
  success: string | null,
  error: string | null
): { kind: "success" | "error"; message: string } | null {
  if (success === "account_linked") {
    return {
      kind: "success",
      message: "Account linked successfully",
    };
  }

  if (!error) {
    return null;
  }

  if (error === "already_linked") {
    return {
      kind: "error",
      message: "This account is already linked",
    };
  }

  if (error === "cannot_link_primary_account") {
    return {
      kind: "error",
      message: "You cannot link your primary account",
    };
  }

  if (error === "invalid_state") {
    return {
      kind: "error",
      message: "Link failed: invalid state. Please try again.",
    };
  }

  if (error === "oauth_cancelled") {
    return {
      kind: "error",
      message: "Account linking was cancelled",
    };
  }

  return {
    kind: "error",
    message: "Account linking failed. Please try again.",
  };
}

function SettingsPageFallback() {
  return (
    <div className="min-h-screen bg-[var(--background)] p-4 md:p-8 text-[var(--foreground)] transition-colors">
      <div className="max-w-2xl mx-auto">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
          <div className="h-8 w-48 bg-[var(--card-muted)] rounded animate-pulse mb-4" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 bg-[var(--card-muted)] rounded animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsPageContent() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [removingAccountId, setRemovingAccountId] = useState<string | null>(
    null
  );
  const [wakatimeKey, setWakatimeKey] = useState("");
  const [savingWakatime, setSavingWakatime] = useState(false);

  const statusMessage = useMemo(
    () =>
      getStatusMessage(searchParams.get("success"), searchParams.get("error")),
    [searchParams]
  );

  const { theme, setTheme } = useHeatmapTheme();

 // Redirect to signin if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/");
    }
  }, [status]);

  // Load settings on mount
  useEffect(() => {
    if (status !== "authenticated" || !session?.githubLogin) {
      return;
    }

    async function loadSettings() {
      try {
        const res = await fetch("/api/user/settings");
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [session, status]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.githubLogin) {
      return;
    }

    async function loadLinkedAccounts() {
      try {
        const res = await fetch("/api/user/github-accounts");
        if (!res.ok) {
          setLinkedAccounts([]);
          return;
        }

        const data = (await res.json()) as AccountsResponse;
        setLinkedAccounts(data.accounts ?? []);
      } catch (error) {
        console.error("Failed to load linked accounts:", error);
        setLinkedAccounts([]);
      } finally {
        setAccountsLoading(false);
      }
    }

    loadLinkedAccounts();
  }, [session, status]);

  const handleTogglePublic = async (value: boolean) => {
    if (!settings) return;

    setSaving(true);
    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_public: value }),
      });

      if (res.ok) {
        const updated = await res.json();
        setSettings(updated);
      } else {
        console.error("Failed to update settings");
      }
    } catch (error) {
      console.error("Error updating settings:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleLeaderboard = async (value: boolean) => {
    if (!settings) return;

    setSaving(true);
    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaderboard_opt_in: value }),
      });

      if (res.ok) {
        const updated = await res.json();
        setSettings(updated);
      } else {
        console.error("Failed to update leaderboard setting");
      }
    } catch (error) {
      console.error("Error updating leaderboard setting:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWakatime = async () => {
    if (!settings) return;
    setSavingWakatime(true);
    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wakatime_api_key: wakatimeKey }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSettings(updated);
        setWakatimeKey("");
        toast.success(wakatimeKey === "" ? "Wakatime key removed" : "Wakatime key saved successfully!");
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "Failed to update Wakatime key");
      }
    } catch (error) {
      console.error("Error updating Wakatime key:", error);
      toast.error("Failed to update Wakatime key");
    } finally {
      setSavingWakatime(false);
    }
  };

  const copyShareLink = () => {
    if (!settings) return;
    const link = `${window.location.origin}/u/${settings.github_login}`;
    navigator.clipboard
      .writeText(link)
      .then(() => {
        setCopied(true);
        toast.success("Link copied successfully!");
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        toast.error("Failed to copy link");
      });
  };

  const handleRemoveAccount = async (githubId: string) => {
    setRemoveError(null);
    setRemovingAccountId(githubId);

    try {
      const res = await fetch(`/api/user/github-accounts/${githubId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setRemoveError(data.error ?? "Failed to remove account");
        return;
      }

      setLinkedAccounts((current) =>
        current.filter((account) => account.githubId !== githubId)
      );
    } catch {
      setRemoveError("Failed to remove account");
    } finally {
      setRemovingAccountId(null);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] p-4 md:p-8 text-[var(--foreground)] transition-colors">
        <div className="max-w-2xl mx-auto">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
            <div className="h-8 w-48 bg-[var(--card-muted)] rounded animate-pulse mb-4" />
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-20 bg-[var(--card-muted)] rounded animate-pulse"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-[var(--background)] p-4 md:p-8 text-[var(--foreground)] transition-colors">
        <div className="max-w-2xl mx-auto">
          <p className="text-[var(--muted-foreground)]">
            Failed to load settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] p-4 md:p-8 text-[var(--foreground)] transition-colors">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <Link href="/dashboard">
            <button className="group inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--accent)] md:bg-[var(--accent)] md:text-[var(--accent-foreground)] transition-all hover:opacity-90 active:scale-95 md:h-auto md:w-auto md:rounded-lg md:px-4 md:py-2">
              <span className="text-lg items-center transition-transform duration-200 group-hover:-translate-x-1.5">
                ←
              </span>
              <span className="ml-2 hidden text-sm font-medium md:inline">
                Back to Dashboard
              </span>
            </button>
          </Link>
          <div className="sm:text-left mr-2">
            <h1 className="text-3xl pl-2 text-center font-bold text-[var(--foreground)]">
              Settings
            </h1>
            <p className="md:text-right text-center mt-2 text-[var(--muted-foreground)]">
              Manage your profile and preferences
            </p>
          </div>
        </div>

        {statusMessage && (
          <div
            className={`mb-6 rounded-xl border p-4 text-sm ${
              statusMessage.kind === "success"
                ? "border-green-500/30 bg-green-500/10 text-green-400"
                : "border-[var(--destructive-muted-border)] bg-[var(--destructive-muted)] text-[var(--destructive)]"
            }`}
          >
            {statusMessage.message}
          </div>
        )}

        {/* Public Profile Section */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <div className="flex items-start justify-between mb-6 gap-4">
            <div>
              <h2 className="text-xl font-semibold text-[var(--card-foreground)]">
                Public Profile
              </h2>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                Share your GitHub stats with a public profile link
              </p>
            </div>

            {/* Toggle Switch */}
            <label className="flex items-center cursor-pointer select-none">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={settings.is_public}
                  onChange={(e) => handleTogglePublic(e.target.checked)}
                  disabled={saving}
                  className="sr-only"
                />
                <div
                  className={`block w-10 h-6 rounded-full transition-colors ${
                    settings.is_public
                      ? "bg-[var(--accent)]"
                      : "bg-[var(--control)]"
                  }`}
                />
                <div
                  className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-[var(--card)] transition-transform ${
                    settings.is_public ? "translate-x-4" : ""
                  }`}
                />
              </div>
            </label>
          </div>

          {/* Share Link Section */}
          {settings.is_public && (
            <div className="mt-6 pt-6 border-t border-[var(--border)]">
              <h3 className="text-sm font-semibold text-[var(--card-foreground)] mb-3">
                Share Your Profile
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={`${window.location.origin}/u/${settings.github_login}`}
                  readOnly
                  className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--control)] px-4 py-2 text-sm text-[var(--card-foreground)] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={copyShareLink}
                  aria-label="Copy profile URL"
                  className="px-4 py-2 rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)] text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-[var(--border)]">
            <h3 className="text-sm font-semibold text-[var(--card-foreground)] mb-3">
              Heatmap colour scheme
            </h3>
            <p className="text-sm text-[var(--muted-foreground)] mb-4">
              Choose a colour scheme for the contribution and streak heatmaps.
            </p>
            <div className="space-y-3">
              <label className="flex cursor-pointer items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--control)] px-4 py-3 text-[var(--foreground)]">
                <span>Default</span>
                <input
                  type="radio"
                  name="heatmap-theme"
                  value="default"
                  checked={theme === "default"}
                  onChange={() => setTheme("default")}
                  className="accent-[var(--accent)] focus:ring-[var(--accent)]"
                />
              </label>
              <label className="flex cursor-pointer items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--control)] px-4 py-3 text-[var(--foreground)]">
                <span>Colour-blind friendly</span>
                <input
                  type="radio"
                  name="heatmap-theme"
                  value="colour-blind-friendly"
                  checked={theme === "colour-blind-friendly"}
                  onChange={() => setTheme("colour-blind-friendly")}
                  className="accent-[var(--accent)] focus:ring-[var(--accent)]"
                />
              </label>
            </div>
          </div>

          {!settings.is_public && (
            <div className="mt-4 p-3 rounded-lg bg-[var(--control)] border border-[var(--border)]">
              <p className="text-sm text-[var(--muted-foreground)]">
                Turn on public profile to generate a shareable link to your
                GitHub stats.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-[var(--card-foreground)]">
                Public Leaderboard
              </h2>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Appear on the public leaderboard for streaks, commits, and pull
                requests.
              </p>
            </div>

            <label className="flex items-center cursor-pointer select-none">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={settings.leaderboard_opt_in}
                  onChange={(e) => handleToggleLeaderboard(e.target.checked)}
                  disabled={saving}
                  className="sr-only"
                />
                <div
                  className={`block h-6 w-10 rounded-full transition-colors ${
                    settings.leaderboard_opt_in
                      ? "bg-[var(--accent)]"
                      : "bg-[var(--control)]"
                  }`}
                />
                <div
                  className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-[var(--card)] transition-transform ${
                    settings.leaderboard_opt_in ? "translate-x-4" : ""
                  }`}
                />
              </div>
            </label>
          </div>

          <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--control)] p-3">
            <p className="text-sm text-[var(--muted-foreground)]">
              Turning this on also enables your public profile so leaderboard
              rows can link to your DevTrack stats.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[var(--card-foreground)]">
                Connected Accounts
              </h2>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Link additional GitHub accounts and switch between them on the
                dashboard.
              </p>
            </div>

            <a
              href="/api/auth/link-github"
              className="inline-flex items-center justify-center rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] hover:opacity-90 transition-opacity"
            >
              Add GitHub Account
            </a>
          </div>

          {removeError && (
            <div className="mt-4 rounded-lg border border-[var(--destructive-muted-border)] bg-[var(--destructive-muted)] p-3 text-sm text-[var(--destructive)]">
              {removeError}
            </div>
          )}

          <div className="mt-6">
            {accountsLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-20 rounded-lg bg-[var(--card-muted)] animate-pulse"
                  />
                ))}
              </div>
            ) : linkedAccounts.length === 0 ? (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--control)] p-4 text-sm text-[var(--muted-foreground)]">
                No linked GitHub accounts yet.
              </div>
            ) : (
              <div className="space-y-3">
                {linkedAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex flex-col gap-3 rounded-lg border border-[var(--border)] bg-[var(--control)] p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="text-sm font-semibold text-[var(--card-foreground)]">
                        {account.githubLogin}
                      </div>
                      <div className="mt-1 text-sm text-[var(--muted-foreground)]">
                        {formatAddedDate(account.addedAt)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveAccount(account.githubId)}
                      aria-label={`Remove ${account.githubLogin}`}
                      disabled={removingAccountId === account.githubId}
                      className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--card-foreground)] transition-colors hover:bg-[var(--destructive-muted)] hover:text-[var(--destructive)] disabled:opacity-60"
                    >
                      {removingAccountId === account.githubId
                        ? "Removing..."
                        : "Remove"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-[var(--card-foreground)]">
                Wakatime Integration
              </h2>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Connect your Wakatime account to display accurate coding time and language usage.
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="wakatime-key" className="block text-sm font-medium text-[var(--card-foreground)] mb-1">
                API Key
              </label>
              <div className="flex gap-2">
                <input
                  id="wakatime-key"
                  type="password"
                  value={wakatimeKey}
                  onChange={(e) => setWakatimeKey(e.target.value)}
                  placeholder={settings.has_wakatime_key ? "•••••••••••••••• (Configured)" : "Enter your Wakatime API key"}
                  autoComplete="new-password"
                  className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--control)] px-4 py-2 text-sm text-[var(--card-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
                <button
                  type="button"
                  onClick={handleSaveWakatime}
                  disabled={savingWakatime}
                  className="px-4 py-2 rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)] text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60 min-w-[80px]"
                >
                  {savingWakatime ? "Saving..." : "Save"}
                </button>
              </div>
              <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                {settings.has_wakatime_key ? "Leave blank and click Save to remove your key." : "You can find your API key in your Wakatime Settings."}
              </p>
            </div>
          </div>
        </div>

        <PrivacySettings />
        <div className="mt-4 flex justify-center items-center pt-6">
          <Link href="/dashboard">
            <button className="group inline-flex items-center justify-center rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-[var(--accent-foreground)] transition-all hover:opacity-90 active:scale-95">
              <span className="mr-2 transition-transform duration-200 group-hover:-translate-x-1.5">
                ←
              </span>
              Back to Dashboard
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsPageFallback />}>
      <SettingsPageContent />
    </Suspense>
  );
}
