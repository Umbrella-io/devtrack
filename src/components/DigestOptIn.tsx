"use client";

import { useEffect, useState } from "react";

export default function DigestOptIn() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings/digest")
      .then((r) => r.json())
      .then((d) => { setEnabled(d.enabled ?? false); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const toggle = async () => {
    setSaving(true);
    setError(null);
    const next = !enabled;

    try {
      const res = await fetch("/api/settings/digest", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ enabled: next }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setEnabled(next);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="h-16 rounded-lg bg-gray-100 animate-pulse" />;
  }

  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-gray-200 p-4">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">Weekly Email Digest</p>
        <p className="mt-0.5 text-xs text-gray-500">
          Get an AI-generated summary of your coding week every Monday at 9 AM UTC.
        </p>
        {error && (
          <p className="mt-1 text-xs text-red-500">{error}</p>
        )}
        {enabled && !saving && (
          <p className="mt-1 text-xs text-green-600">
            ✓ You will receive your first digest next Monday
          </p>
        )}
      </div>

      {/* Accessible toggle switch */}
      <button
        role="switch"
        aria-checked={enabled}
        aria-label="Toggle weekly email digest"
        onClick={toggle}
        disabled={saving}
        className={[
          "relative flex-shrink-0 inline-flex h-6 w-11 items-center rounded-full",
          "transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
          enabled  ? "bg-blue-600"              : "bg-gray-300",
          saving   ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        ].join(" ")}
      >
        <span
          className={[
            "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
            enabled ? "translate-x-6" : "translate-x-1",
          ].join(" ")}
        />
      </button>
    </div>
  );
}