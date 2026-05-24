"use client";

import { useState } from "react";

export default function PrivacySettings() {
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  async function handleExport() {
    setDownloading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/user/data-export");
      if (!res.ok) {
        throw new Error("Failed to export data");
      }

      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `devtrack-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage({ kind: "success", text: "Data exported successfully" });
    } catch {
      setMessage({ kind: "error", text: "Failed to export data" });
    } finally {
      setDownloading(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText !== "DELETE") {
      setMessage({ kind: "error", text: "Please type DELETE to confirm" });
      return;
    }

    setDeleting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/user/data-export", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmText: "DELETE" }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete account");
      }

      window.location.href = "/api/auth/signout";
    } catch (err) {
      setMessage({
        kind: "error",
        text: err instanceof Error ? err.message : "Failed to delete account",
      });
      setDeleting(false);
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-[var(--card-foreground)] mb-1">
        Privacy & Data
      </h2>
      <p className="text-sm text-[var(--muted-foreground)] mb-6">
        Manage your data and privacy settings
      </p>

      {message && (
        <div
          className={`mb-4 rounded-lg border p-4 text-sm ${
            message.kind === "success"
              ? "border-[var(--success)]/30 bg-[var(--success)]/10 text-[var(--success)]"
              : "border-[var(--destructive)]/30 bg-[var(--destructive)]/10 text-[var(--destructive)]"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-[var(--card-foreground)] mb-2">
            Data Export
          </h3>
          <p className="text-sm text-[var(--muted-foreground)] mb-4">
            Download all your data in JSON format. This includes your goals,
            metrics, settings, and more.
          </p>
          <button
            onClick={handleExport}
            disabled={downloading}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] transition hover:opacity-90 disabled:opacity-60"
          >
            {downloading ? "Exporting..." : "Export My Data"}
          </button>
        </div>

        <div className="border-t border-[var(--border)] pt-6">
          <h3 className="text-sm font-semibold text-[var(--card-foreground)] mb-2">
            Delete Account
          </h3>
          <p className="text-sm text-[var(--muted-foreground)] mb-4">
            Permanently delete all your data from DevTrack. This action cannot be
            undone.
          </p>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="rounded-lg border border-[var(--destructive)]/30 px-4 py-2 text-sm font-medium text-[var(--destructive)] transition hover:bg-[var(--destructive)]/10"
            >
              Delete My Account
            </button>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 p-4">
                <p className="text-sm text-[var(--destructive)] mb-3">
                  This will permanently delete:
                </p>
                <ul className="text-xs text-[var(--muted-foreground)] space-y-1 mb-4">
                  <li>• Your account and profile</li>
                  <li>• All goals and progress data</li>
                  <li>• Metric history and snapshots</li>
                  <li>• Webhook configurations</li>
                  <li>• Linked accounts and integrations</li>
                  <li>• Local coding time data</li>
                </ul>
                <p className="text-sm text-[var(--destructive)] mb-3">
                  Type <strong>DELETE</strong> to confirm:
                </p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE to confirm"
                  className="w-full rounded-lg border border-[var(--destructive)]/30 bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none mb-3"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting || deleteConfirmText !== "DELETE"}
                    className="rounded-lg bg-[var(--destructive)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] transition hover:bg-[var(--destructive)]/90 disabled:opacity-60"
                  >
                    {deleting ? "Deleting..." : "Confirm Delete"}
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText("");
                    }}
                    className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--control)]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
