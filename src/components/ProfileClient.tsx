"use client";

import Navbar from "@/components/Navbar";
import Image from "next/image";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";

type ProfileUser = {
  id: string;
  username: string;
  github_id: string;
  email: string | null;
  avatar: string | null;
  created_at: string | null;
  updated_at: string;
  connected_accounts: string[];
};

type ProfileClientProps = {
  email: string | null;
  displayName: string | null;
  image: string | null;
};

type ApiErrorResponse = {
  error?: string;
};

function getApiErrorMessage(parsed: unknown, fallback: string): string {
  if (typeof parsed === "object" && parsed !== null && "error" in parsed) {
    const maybeError = (parsed as ApiErrorResponse).error;
    if (typeof maybeError === "string" && maybeError.trim().length > 0) {
      return maybeError;
    }
  }

  if (typeof parsed === "string" && parsed.trim().length > 0) {
    return parsed;
  }

  return fallback;
}

function isProfileUser(obj: unknown): obj is ProfileUser {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  return typeof o.id === "string" && typeof o.username === "string" && typeof o.github_id === "string";
}

function formatDate(value: string | null): string {
  if (!value) {
    return "Unknown";
  }

  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function ProfileClient({
  email: sessionEmail,
  displayName,
  image: sessionImage,
}: ProfileClientProps) {
  const { data: session } = useSession();
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    async function fetchProfile(): Promise<void> {
      try {
        const response = await fetch("/api/user", { cache: "no-store" });
        const text = await response.text();
        let parsed: unknown = null;
        try {
          parsed = text ? JSON.parse(text) : null;
        } catch (e) {
          parsed = text;
        }

        if (!response.ok) {
          const message = getApiErrorMessage(parsed, `HTTP ${response.status}`);
          throw new Error(message);
        }

        if (!isProfileUser(parsed)) {
          throw new Error("Unexpected profile shape from server");
        }

        setUser(parsed);
      } catch (err) {
        console.error("Profile fetch error:", err);
        setError(err instanceof Error ? err.message : "Unexpected error");
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, []);

  async function onConfirmDeleteAccount(): Promise<void> {
    setDeleting(true);
    setError(null);

    try {
      const response = await fetch("/api/user", {
        method: "DELETE",
      });

      if (!response.ok) {
        const text = await response.text();
        let parsed: unknown = null;
        try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
        const message = getApiErrorMessage(parsed, `HTTP ${response.status}`);
        throw new Error(message);
      }

      await signOut({ callbackUrl: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete account");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold">Profile</h1>
            <p className="text-[var(--muted-foreground)] mt-2">
              Manage your account settings
            </p>
          </div>

          {loading && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
              <p className="text-[var(--muted-foreground)]">Loading profile...</p>
            </div>
          )}

          {!loading && error && (
            <>
              <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-6 mb-4">
                <p className="text-red-400">Error: {error}</p>
              </div>

              {/* Fallback to client session data if available */}
              {session?.user && (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6 mb-6">
                  <div className="flex items-center gap-4">
                    {session.user.image ? (
                      <Image src={session.user.image} alt="avatar" width={80} height={80} className="rounded-full" />
                    ) : (
                      <div className="h-20 w-20 rounded-full bg-[var(--control)] flex items-center justify-center text-xl font-semibold">{(session.user.name||"?").charAt(0).toUpperCase()}</div>
                    )}
                    <div>
                      <h2 className="text-2xl font-semibold">{session.user.name}</h2>
                      <p className="text-[var(--muted-foreground)]">{session.user.email}</p>
                      <p className="mt-2 text-sm text-[var(--muted-foreground)]">Limited profile shown — server data failed to load.</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {!loading && !error && user && (
            <>
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6 md:p-8 mb-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-20 w-20 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--control)]">
                    {sessionImage || user.avatar ? (
                      <Image
                        src={sessionImage || user.avatar || ""}
                        alt="Profile avatar"
                        width={80}
                        height={80}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xl font-semibold">
                        {(displayName || user.username || "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div>
                    <h2 className="text-2xl font-semibold">
                      {displayName || user.username}
                    </h2>
                    <p className="text-[var(--muted-foreground)]">
                      {sessionEmail || user.email || "No email available"}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-[var(--muted-foreground)]">GitHub Username</p>
                    <p className="text-lg font-medium">{user.username}</p>
                  </div>

                  <div>
                    <p className="text-sm text-[var(--muted-foreground)]">GitHub ID</p>
                    <p className="font-mono text-sm">{user.github_id}</p>
                  </div>

                  <div>
                    <p className="text-sm text-[var(--muted-foreground)]">Account Created</p>
                    <p>{formatDate(user.created_at)}</p>
                  </div>

                  <div>
                    <p className="text-sm text-[var(--muted-foreground)]">Connected Accounts</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {user.connected_accounts.map((account) => (
                        <span
                          key={account}
                          className="rounded-full border border-[var(--border)] bg-[var(--control)] px-3 py-1 text-xs font-medium uppercase"
                        >
                          {account}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border border-red-500 rounded-lg p-6 bg-red-500/10">
                <h2 className="text-xl font-semibold text-red-400 mb-3">Danger Zone</h2>
                <p className="text-[var(--muted-foreground)] mb-6">
                  Deleting your account is permanent and cannot be undone.
                </p>

                {!confirmDelete && (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    disabled={deleting}
                    className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-5 py-3 rounded-lg font-medium transition"
                  >
                    {deleting ? "Deleting..." : "Delete Account"}
                  </button>
                )}

                {confirmDelete && (
                  <div className="rounded-lg border border-red-500/60 bg-red-500/15 p-4">
                    <p className="text-sm text-red-300 mb-4">
                      This action will permanently remove your account and all associated data. This cannot be undone.
                    </p>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={onConfirmDeleteAccount}
                        disabled={deleting}
                        className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition"
                      >
                        {deleting ? "Deleting..." : "Confirm Delete"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        disabled={deleting}
                        className="bg-[var(--control)] hover:bg-[var(--card)] disabled:opacity-50 text-[var(--foreground)] px-4 py-2 rounded-lg font-medium border border-[var(--border)] transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
