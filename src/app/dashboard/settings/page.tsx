"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

interface UserSettings {
  id: string;
  github_login: string;
  is_public: boolean;
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/");
    }
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.githubLogin) return;

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
        if (statusRef.current) {
          statusRef.current.textContent = value
            ? "Public profile enabled. Your stats are now shareable."
            : "Public profile disabled. Your stats are now private.";
        }
      } else {
        console.error("Failed to update settings");
        if (statusRef.current) {
          statusRef.current.textContent = "Failed to update settings. Please try again.";
        }
      }
    } catch (error) {
      console.error("Error updating settings:", error);
    } finally {
      setSaving(false);
    }
  };

  const copyShareLink = () => {
    if (!settings) return;

    const link = `${window.location.origin}/u/${settings.github_login}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    if (statusRef.current) {
      statusRef.current.textContent = "Profile link copied to clipboard.";
    }
    setTimeout(() => setCopied(false), 2000);
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] p-4 md:p-8 text-[var(--foreground)] transition-colors">
        <div className="max-w-2xl mx-auto">
          <div
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6"
            role="status"
            aria-label="Loading settings"
          >
            <div className="h-8 w-48 bg-[var(--card-muted)] rounded animate-pulse mb-4" />
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-[var(--card-muted)] rounded animate-pulse" />
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
          <p role="alert" className="text-[var(--muted-foreground)]">
            Failed to load settings.
          </p>
        </div>
      </div>
    );
  }

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/u/${settings.github_login}`
      : `/u/${settings.github_login}`;

  return (
    <div
      id="main-content"
      className="min-h-screen bg-[var(--background)] p-4 md:p-8 text-[var(--foreground)] transition-colors"
    >
      {/* Live region for status announcements */}
      <div ref={statusRef} aria-live="polite" aria-atomic="true" className="sr-only" />

      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Settings</h1>
          <p className="mt-2 text-[var(--muted-foreground)]">
            Manage your profile and preferences
          </p>
        </div>

        {/* Public Profile Section */}
        <section
          aria-labelledby="public-profile-heading"
          className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm"
        >
          <div className="flex items-start justify-between mb-6 gap-4">
            <div>
              <h2
                id="public-profile-heading"
                className="text-xl font-semibold text-[var(--card-foreground)]"
              >
                Public Profile
              </h2>
              <p
                id="public-profile-desc"
                className="text-sm text-[var(--muted-foreground)] mt-1"
              >
                Share your GitHub stats with a public profile link
              </p>
            </div>

            {/* Accessible Toggle Switch */}
            <div className="flex items-center gap-3">
              <span
                id="public-toggle-label"
                className="text-sm text-[var(--muted-foreground)] select-none"
              >
                {settings.is_public ? "On" : "Off"}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={settings.is_public}
                aria-labelledby="public-toggle-label"
                aria-describedby="public-profile-desc"
                disabled={saving}
                aria-busy={saving}
                onClick={() => handleTogglePublic(!settings.is_public)}
                className={`relative inline-flex h-6 w-10 cursor-pointer items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60 ${
                  settings.is_public ? "bg-[var(--accent)]" : "bg-[var(--control)]"
                }`}
              >
                <span className="sr-only">
                  {settings.is_public ? "Disable public profile" : "Enable public profile"}
                </span>
                <span
                  aria-hidden="true"
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    settings.is_public ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Share Link Section */}
          {settings.is_public && (
            <div className="mt-6 pt-6 border-t border-[var(--border)]">
              <h3 className="text-sm font-semibold text-[var(--card-foreground)] mb-3">
                Share Your Profile
              </h3>
              <div className="flex gap-2">
                <label htmlFor="share-url" className="sr-only">
                  Your public profile URL
                </label>
                <input
                  id="share-url"
                  type="text"
                  value={shareUrl}
                  readOnly
                  aria-label="Your public profile URL"
                  className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--control)] px-4 py-2 text-sm text-[var(--card-foreground)] focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
                />
                <button
                  type="button"
                  onClick={copyShareLink}
                  aria-label={copied ? "Link copied to clipboard" : "Copy profile link to clipboard"}
                  className="px-4 py-2 rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)] text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          )}

          {!settings.is_public && (
            <div className="mt-4 p-3 rounded-lg bg-[var(--control)] border border-[var(--border)]">
              <p className="text-sm text-[var(--muted-foreground)]">
                Turn on public profile to generate a shareable link to your
                GitHub stats.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}