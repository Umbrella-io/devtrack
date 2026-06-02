"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount } from "@/components/AccountContext";
import { toast } from "sonner";

interface CommunityData {
  discussionsStarted: number;
  acceptedAnswers: number;
  commentsPosted: number;
}

export default function CommunityMetrics() {
  const { selectedAccount } = useAccount();
  const [metrics, setMetrics] = useState<CommunityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(() => {
    setLoading(true);
    setError(null);

    const url =
      selectedAccount !== null
        ? `/api/metrics/discussions?accountId=${encodeURIComponent(selectedAccount)}`
        : "/api/metrics/discussions";

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("API error");
        return res.json();
      })
      .then((data: CommunityData) => setMetrics(data))
      .catch(() => {
        setError("Failed to load community metrics");
        toast.error("Failed to load community metrics");
      })
      .finally(() => setLoading(false));
  }, [selectedAccount]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const stats = metrics
    ? [
        { label: "Discussions Started", value: metrics.discussionsStarted },
        { label: "Accepted Answers", value: metrics.acceptedAnswers },
        { label: "Comments Posted", value: metrics.commentsPosted },
      ]
    : [];

  return (
    <div className="rounded-xl border p-6">
      <div className="flex justify-between mb-4">
        <div>
          <h2 className="font-semibold">Community Discussions</h2>
          <p className="text-sm text-gray-500">
            GitHub Discussions activity
          </p>
        </div>

        <button
          onClick={fetchMetrics}
          disabled={loading}
          className="text-xs border px-3 py-1 rounded"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <div className="grid gap-4">
          {stats.map((s) => (
            <div key={s.label} className="p-4 border rounded">
              <div className="text-xl font-bold">{s.value}</div>
              <div className="text-sm text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}