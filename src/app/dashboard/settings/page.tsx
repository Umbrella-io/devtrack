"use client";

import { useEffect, useState } from "react";
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

  const copyShareLink = () => {
    if (!settings) return;

    const link = `${window.location.origin}/u/${settings.github_login}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--foreground)]">
            Settings
          </h1>
          <p className="mt-2 text-[var(--muted-foreground)]">
            Manage your profile and preferences
          </p>
        </div>

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
                  className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${
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
                  onClick={copyShareLink}
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
        </div>
      </div>
    </div>
  );
}
