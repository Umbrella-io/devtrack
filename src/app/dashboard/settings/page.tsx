"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect, useSearchParams } from "next/navigation";
import { useHeatmapTheme } from "@/hooks/useHeatmapTheme";
import PrivacySettings from "@/components/PrivacySettings";
import ConfirmModal from "@/components/ConfirmModal";
import MarkdownBio from "@/components/MarkdownBio";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import WebhookManager from "@/components/webhook/WebhookManager";

// ── Max length for the profile bio ──────────────────────────────────────────
const BIO_MAX = 160;

interface UserSettings {
  id: string;
  github_login: string;
  bio: string;
  is_public: boolean;
  leaderboard_opt_in: boolean;
  weekly_digest_opt_in: boolean;
  has_wakatime_key?: boolean;
  discord_webhook_url?: string;
  timezone?: string;
  pinned_repos?: string[];
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
          <h1 className="mb-4 text-3xl font-bold text-[var(--foreground)]">
            Settings
          </h1>
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
  const router = useRouter();
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
  const [bioDraft, setBioDraft] = useState("");
  const [showBioPreview, setShowBioPreview] = useState(false);
  const [savingBio, setSavingBio] = useState(false);
  const [savingWakatime, setSavingWakatime] = useState(false);
  const [discordWebhook, setDiscordWebhook] = useState("");
  const [timezone, setTimezone] = useState("");
  const [savingDiscord, setSavingDiscord] = useState(false);
  const [testingDiscord, setTestingDiscord] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  // Spotlight Repos States
  const [userRepos, setUserRepos] = useState<string[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [repoSearchQuery, setRepoSearchQuery] = useState("");

  const statusMessage = useMemo(
    () =>
      getStatusMessage(searchParams.get("success"), searchParams.get("error")),
    [searchParams]
  );

  const { theme, setTheme } = useHeatmapTheme();

  // Handle beforeunload to warn about unsaved changes (Browser Default)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Intercept in-app navigation
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");

      if (anchor && isDirty) {
        const href = anchor.getAttribute("href");
        // Only intercept internal links
        if (href && !href.startsWith("#") && !anchor.hasAttribute("download") && !href.startsWith("http")) {
          e.preventDefault();
          e.stopPropagation();
          setPendingPath(href);
          setShowConfirmModal(true);
        }
      }
    };

    const handlePopState = () => {
      if (isDirty) {
        // We can't easily prevent popstate without a prompt
        // but we can alert the user.
        setPendingPath("BACK");
        setShowConfirmModal(true);
        // Push state back to prevent the URL from changing immediately
        window.history.pushState(null, "", window.location.href);
      }
    };

    window.addEventListener("click", handleAnchorClick, true);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("click", handleAnchorClick, true);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isDirty]);

  const handleConfirmLeave = () => {
    setIsDirty(false); // Clear dirty state so we can navigate
    setShowConfirmModal(false);
    if (pendingPath === "BACK") {
      window.history.back();
    } else if (pendingPath) {
      router.push(pendingPath);
    }
  };

  const handleCancelLeave = () => {
    setShowConfirmModal(false);
    setPendingPath(null);
  };

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
          setBioDraft(data.bio ?? "");
          setDiscordWebhook(data.discord_webhook_url || "");
          setTimezone(data.timezone || "UTC");
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [session, status]);

  // Load active repos for spotlight pinning
  useEffect(() => {
    if (status !== "authenticated") return;
    setLoadingRepos(true);
    fetch("/api/metrics/repos?days=90")
      .then((r) => r.json())
      .then((d) => {
        const names = (d.repos ?? []).map((r: any) => r.name);
        setUserRepos(names);
      })
      .catch((err) => console.error("Failed to load user repos:", err))
      .finally(() => setLoadingRepos(false));
  }, [status]);

  const handleUpdatePinnedRepos = async (newPins: string[]) => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned_repos: newPins }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSettings(updated);
        toast.success("Spotlight repositories updated successfully!");
      } else {
        toast.error("Failed to update spotlight repositories.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating spotlight repositories.");
    } finally {
      setSaving(false);
    }
  };

  const handlePinRepo = async (repoName: string) => {
    if (!settings) return;
    const currentPins = settings.pinned_repos || [];
    if (currentPins.includes(repoName)) return;
    if (currentPins.length >= 3) {
      toast.error("Maximum 3 pinned repositories allowed!");
      return;
    }

    const updatedPins = [...currentPins, repoName];
    await handleUpdatePinnedRepos(updatedPins);
  };

  const handleUnpinRepo = async (repoName: string) => {
    if (!settings) return;
    const currentPins = settings.pinned_repos || [];
    const updatedPins = currentPins.filter((name) => name !== repoName);
    await handleUpdatePinnedRepos(updatedPins);
  };

  const handleMovePin = async (index: number, direction: "up" | "down") => {
    if (!settings) return;
    const currentPins = [...(settings.pinned_repos || [])];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentPins.length) return;

    // Swap elements
    const temp = currentPins[index];
    currentPins[index] = currentPins[targetIndex];
    currentPins[targetIndex] = temp;

    await handleUpdatePinnedRepos(currentPins);
  };

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
        toast.error("Failed to update public profile setting");
      }
    } catch (error) {
      console.error("Error updating settings:", error);
      toast.error("Failed to update public profile setting");
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
      toast.error("Failed to update leaderboard setting");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleWeeklyDigest = async (value: boolean) => {
    if (!settings) return;

    setSaving(true);
    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekly_digest_opt_in: value }),
      });

      if (res.ok) {
        const updated = await res.json();
        setSettings(updated);
      } else {
        console.error("Failed to update weekly digest setting");
      }
    } catch (error) {
      console.error("Error updating weekly digest setting:", error);
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
        setIsDirty(false);
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

  const handleSaveBio = async () => {
    if (!settings || bioDraft.length > 500) return;

    setSavingBio(true);
    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio: bioDraft }),
      });

      if (res.ok) {
        const updated = await res.json();
        setSettings(updated);
        setBioDraft(updated.bio ?? "");
        setIsDirty(false);
        toast.success("Bio saved successfully!");
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "Failed to update bio");
      }
    } catch (error) {
      console.error("Error updating bio:", error);
      toast.error("Failed to update bio");
    } finally {
      setSavingBio(false);
    }
  };

  const handleSaveDiscord = async () => {
    if (!settings) return;
    setSavingDiscord(true);
    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discord_webhook_url: discordWebhook, timezone }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSettings(updated);
        setIsDirty(false);
        toast.success(discordWebhook === "" ? "Discord Webhook removed" : "Discord settings saved successfully!");
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "Failed to update Discord settings");
      }
    } catch (error) {
      console.error("Error updating Discord settings:", error);
      toast.error("Failed to update Discord settings");
    } finally {
      setSavingDiscord(false);
    }
  };

  const handleTestDiscord = async () => {
    if (!discordWebhook) {
      toast.error("Please enter a Webhook URL first");
      return;
    }
    setTestingDiscord(true);
    try {
      const res = await fetch("/api/user/settings/discord-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: discordWebhook }),
      });
      if (res.ok) {
        toast.success("Test notification sent! Check your Discord server.");
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "Failed to send test notification");
      }
    } catch (error) {
      console.error("Error sending test notification:", error);
      toast.error("Failed to send test notification");
    } finally {
      setTestingDiscord(false);
    }
  };

  const copyShareLink = () => {
    if (!settings) return;
    const link = `${window.location.origin}/u/${settings.github_login}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      toast.success("Link copied successfully!");
      setTimeout(() => setCopied(false), 2000);
    }).catch((err) => {
      console.error("Clipboard copy failed:", err);
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
    } catch (error) {
      console.error("Failed to remove account:", error);
      setRemoveError("Failed to remove account");
      toast.error("Failed to remove account");
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
            <button aria-label="Back to Dashboard" className="group inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--accent)] md:bg-[var(--accent)] md:text-[var(--accent-foreground)] transition-all hover:opacity-90 active:scale-95 md:h-auto md:w-auto md:rounded-lg md:px-4 md:py-2">
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
                ? "border-[var(--success)]/30 bg-[var(--success)]/10 text-[var(--success)]"
                : "border-[var(--error)]/30 bg-[var(--error)]/10 text-[var(--error)]"
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
                  aria-label="Toggle Public Profile"
                  onChange={(e) => handleTogglePublic(e.target.checked)}
                  disabled={saving}
                  className="sr-only"
                />
                <div
                  className={`block w-10 h-6 rounded-full transition-colors ${settings.is_public
                    ? "bg-[var(--accent)]"
                    : "bg-[var(--control)]"
                    }`}
                />
                <div
                  className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-[var(--card)] transition-transform ${settings.is_public ? "translate-x-4" : ""
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

          {/* ── Bio field with character counter ── NEW ─────────────────────── */}
          <div className="mt-6 pt-6 border-t border-[var(--border)]">
            <h3 className="text-sm font-semibold text-[var(--card-foreground)] mb-1">
              Bio
            </h3>
            <p className="text-sm text-[var(--muted-foreground)] mb-3">
              Write a short bio shown on your public profile.
            </p>

            <textarea
              id="bio"
              value={bioDraft}
              onChange={(e) => {
                setBioDraft(e.target.value.slice(0, BIO_MAX));
                setIsDirty(true);
              }}
              placeholder="Tell others about yourself..."
              rows={3}
              maxLength={BIO_MAX}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--control)] px-4 py-2 text-sm text-[var(--card-foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
            />

            {/* Character counter */}
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-[var(--muted-foreground)]">
                {bioDraft.length === 0 && "Shown on your public /u/ page."}
              </p>
              <p
                className={`text-xs font-medium tabular-nums transition-colors ${
                  bioDraft.length >= BIO_MAX
                    ? "text-[var(--destructive)]"
                    : bioDraft.length >= Math.floor(BIO_MAX * 0.9)
                    ? "text-yellow-500"
                    : "text-[var(--muted-foreground)]"
                }`}
              >
                {bioDraft.length} / {BIO_MAX}
              </p>
            </div>

            <div className="mt-3">
              <button
                type="button"
                onClick={handleSaveBio}
                disabled={savingBio}
                className="px-4 py-2 rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)] text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {savingBio ? "Saving..." : "Save Bio"}
              </button>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-[var(--border)]">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[var(--card-foreground)]">
                  Profile Bio
                </h3>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  Add a short Markdown bio for your public profile.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBioPreview((value) => !value)}
                className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--card-foreground)] transition-colors hover:bg-[var(--control)]"
              >
                {showBioPreview ? "Hide Preview" : "Show Preview"}
              </button>
            </div>

            <textarea
              value={bioDraft}
              onChange={(e) => {
                setBioDraft(e.target.value);
                setIsDirty(true);
              }}
              maxLength={500}
              rows={5}
              placeholder="Write a short bio with **bold**, _italic_, `code`, or links."
              className="w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--control)] px-4 py-3 text-sm text-[var(--card-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />

            {showBioPreview && (
              <div className="mt-3 min-h-[128px] rounded-lg border border-[var(--border)] bg-[var(--control)] p-4 text-[var(--card-foreground)]">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                  Live Preview
                </p>
                {bioDraft.trim() ? (
                  <MarkdownBio bio={bioDraft} />
                ) : (
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Nothing to preview yet.
                  </p>
                )}
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <span
                className={`text-xs ${
                  bioDraft.length > 500
                    ? "text-[var(--error)]"
                    : "text-[var(--muted-foreground)]"
                }`}
              >
                {bioDraft.length}/500 characters
              </span>
              <button
                type="button"
                onClick={handleSaveBio}
                disabled={
                  savingBio ||
                  bioDraft.length > 500 ||
                  bioDraft === (settings.bio ?? "")
                }
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {savingBio ? "Saving..." : "Save Bio"}
              </button>
            </div>
          </div>

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
                  onChange={() => {
                    setTheme("default");
                    setIsDirty(true);
                  }}
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
                  onChange={() => {
                    setTheme("colour-blind-friendly");
                    setIsDirty(true);
                  }}
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

          {isDirty && (
            <div className="mt-6 pt-6 border-t border-[var(--border)] flex justify-end">
              <button
                type="button"
                onClick={() => {
                  // The toggles themselves already call the API,
                  // but for the heatmap theme which is local only,
                  // or to clear the dirty state after a manual change,
                  // we provide this clear feedback.
                  setIsDirty(false);
                  toast.success("Settings saved successfully!");
                }}
                className="px-6 py-2 rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)] text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Save Changes
              </button>
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
                  aria-label="Toggle Public Leaderboard"
                  onChange={(e) => handleToggleLeaderboard(e.target.checked)}
                  disabled={saving}
                  className="sr-only"
                />
                <div
                  className={`block h-6 w-10 rounded-full transition-colors ${settings.leaderboard_opt_in
                    ? "bg-[var(--accent)]"
                    : "bg-[var(--control)]"
                    }`}
                />
                <div
                  className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-[var(--card)] transition-transform ${settings.leaderboard_opt_in ? "translate-x-4" : ""
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

        {/* Repository Spotlight Section */}
        <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[var(--card-foreground)]">
            Repository Spotlight 🚀
          </h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)] mb-6">
            Pin up to 3 repositories to showcase on your dashboard and public profile.
          </p>

          {/* Currently Pinned */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-[var(--card-foreground)] mb-3">
              Pinned Repositories ({(settings.pinned_repos || []).length}/3)
            </h3>
            {(settings.pinned_repos || []).length === 0 ? (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--control)] p-4 text-sm text-[var(--muted-foreground)] text-center">
                No repositories pinned yet. Use the search below to spotlight your best projects!
              </div>
            ) : (
              <div className="space-y-3">
                {(settings.pinned_repos || []).map((repoName, index) => (
                  <div
                    key={repoName}
                    className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--control)] p-4"
                  >
                    <div className="min-w-0 flex-1 pr-4">
                      <span className="text-sm font-semibold text-[var(--card-foreground)] truncate block">
                        {repoName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Reorder Buttons */}
                      <button
                        type="button"
                        onClick={() => handleMovePin(index, "up")}
                        disabled={index === 0}
                        title="Move Up"
                        aria-label={`Move ${repoName} up`}
                        className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--control-hover)] text-[var(--card-foreground)] disabled:opacity-40"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMovePin(index, "down")}
                        disabled={index === (settings.pinned_repos || []).length - 1}
                        title="Move Down"
                        aria-label={`Move ${repoName} down`}
                        className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--control-hover)] text-[var(--card-foreground)] disabled:opacity-40"
                      >
                        ↓
                      </button>

                      {/* Unpin Button */}
                      <button
                        type="button"
                        onClick={() => handleUnpinRepo(repoName)}
                        aria-label={`Unpin ${repoName}`}
                        className="ml-2 rounded-lg border border-[var(--destructive-muted-border)] hover:bg-[var(--destructive-muted)] px-3 py-1.5 text-xs font-semibold text-[var(--destructive)]"
                      >
                        Unpin
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pin New Repos (Search) */}
          {(settings.pinned_repos || []).length < 3 && (
            <div className="border-t border-[var(--border)]/60 pt-6">
              <h3 className="text-sm font-semibold text-[var(--card-foreground)] mb-3">
                Search & Pin Repositories
              </h3>
              <input
                type="text"
                value={repoSearchQuery}
                onChange={(e) => setRepoSearchQuery(e.target.value)}
                placeholder="Type to search your repositories..."
                aria-label="Search repositories to pin"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--control)] px-4 py-2 text-sm text-[var(--card-foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] mb-4"
              />

              {loadingRepos ? (
                <div className="text-center py-4 text-xs text-[var(--muted-foreground)]">
                  Loading your repositories...
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-2 scrollbar-thin">
                  {userRepos
                    .filter(
                      (repoName) =>
                        !(settings.pinned_repos || []).includes(repoName) &&
                        repoName.toLowerCase().includes(repoSearchQuery.toLowerCase())
                    )
                    .slice(0, 5)
                    .map((repoName) => (
                      <div
                        key={repoName}
                        className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--control)]/40 hover:bg-[var(--control)] px-4 py-2 transition-colors"
                      >
                        <span className="text-xs font-medium text-[var(--card-foreground)] truncate">
                          {repoName}
                        </span>
                        <button
                          type="button"
                          onClick={() => handlePinRepo(repoName)}
                          aria-label={`Pin ${repoName}`}
                          className="rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)] px-3 py-1 text-xs font-semibold hover:opacity-90 transition-opacity"
                        >
                          Pin
                        </button>
                      </div>
                    ))}
                  {userRepos.filter(
                    (repoName) =>
                      !(settings.pinned_repos || []).includes(repoName) &&
                      repoName.toLowerCase().includes(repoSearchQuery.toLowerCase())
                  ).length === 0 && (
                    <div className="text-center py-4 text-xs text-[var(--muted-foreground)]">
                      No repositories available to pin.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-[var(--card-foreground)]">
                Weekly Email Digest
              </h2>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Receive an optional weekly email digest every Monday morning summarizing your coding habits.
              </p>
            </div>

            <label className="flex items-center cursor-pointer select-none">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={settings.weekly_digest_opt_in}
                  aria-label="Toggle Weekly Email Digest"
                  onChange={(e) => handleToggleWeeklyDigest(e.target.checked)}
                  disabled={saving}
                  className="sr-only"
                />
                <div
                  className={`block h-6 w-10 rounded-full transition-colors ${
                    settings.weekly_digest_opt_in
                      ? "bg-[var(--accent)]"
                      : "bg-[var(--control)]"
                  }`}
                />
                <div
                  className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-[var(--card)] transition-transform ${
                    settings.weekly_digest_opt_in ? "translate-x-4" : ""
                  }`}
                />
              </div>
            </label>
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
            <div className="mt-4 rounded-lg border border-[var(--error)]/30 bg-[var(--error)]/10 p-3 text-sm text-[var(--error)]">
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
                      className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--card-foreground)] transition-colors hover:bg-[var(--error)]/10 hover:text-[var(--error)] disabled:opacity-60"
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
                  onChange={(e) => {
                    setWakatimeKey(e.target.value);
                    setIsDirty(true);
                  }}
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

        <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-[var(--card-foreground)]">
                Discord Integration
              </h2>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Receive streak reminders and milestone alerts in your Discord server.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="discord-webhook" className="block text-sm font-medium text-[var(--card-foreground)] mb-1">
                Webhook URL
              </label>
              <div className="flex gap-2">
                <input
                  id="discord-webhook"
                  type="text"
                  value={discordWebhook}
                  onChange={(e) => {
                    setDiscordWebhook(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="https://discord.com/api/webhooks/..."
                  className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--control)] px-4 py-2 text-sm text-[var(--card-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="timezone-select" className="block text-sm font-medium text-[var(--card-foreground)] mb-1">
                Timezone (For 8 PM reminders)
              </label>
              <select
                id="timezone-select"
                value={timezone}
                onChange={(e) => {
                  setTimezone(e.target.value);
                  setIsDirty(true);
                }}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--control)] px-4 py-2 text-sm text-[var(--card-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="Europe/London">London (GMT/BST)</option>
                <option value="Europe/Paris">Central European Time (CET)</option>
                <option value="Asia/Kolkata">India Standard Time (IST)</option>
                <option value="Asia/Tokyo">Japan Standard Time (JST)</option>
                <option value="Australia/Sydney">Australian Eastern Time (AET)</option>
                {/* Additional common timezones */}
                <option value="America/Sao_Paulo">Brasilia Time (BRT)</option>
                <option value="Asia/Dubai">Gulf Standard Time (GST)</option>
                <option value="Asia/Singapore">Singapore Standard Time (SGT)</option>
              </select>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={handleSaveDiscord}
                disabled={savingDiscord}
                className="px-4 py-2 rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)] text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {savingDiscord ? "Saving..." : "Save Discord Settings"}
              </button>
              <button
                type="button"
                onClick={handleTestDiscord}
                disabled={testingDiscord || !discordWebhook}
                className="px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--control)] text-[var(--card-foreground)] text-sm font-medium hover:bg-[var(--card-muted)] transition-colors disabled:opacity-60"
              >
                {testingDiscord ? "Testing..." : "Test Notification"}
              </button>
            </div>
            <p className="mt-2 text-xs text-[var(--muted-foreground)]">
              Leave Webhook URL blank and click Save to unlink Discord.
            </p>
          </div>
        </div>

        <PrivacySettings />
        <div className="mt-4 flex justify-center items-center pt-6">
          <Link href="/dashboard">
            <button aria-label="Back to Dashboard" className="group inline-flex items-center justify-center rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-[var(--accent-foreground)] transition-all hover:opacity-90 active:scale-95">
              <span className="mr-2 transition-transform duration-200 group-hover:-translate-x-1.5">
                ←
              </span>
              Back to Dashboard
            </button>
          </Link>
        </div>

        <WebhookManager />

        <ConfirmModal
          isOpen={showConfirmModal}
          title="Unsaved Changes"
          message="You have unsaved changes in your settings. If you leave now, your progress will be lost."
          confirmLabel="Leave Anyway"
          cancelLabel="Stay and Save"
          onConfirm={handleConfirmLeave}
          onCancel={handleCancelLeave}
        />
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
