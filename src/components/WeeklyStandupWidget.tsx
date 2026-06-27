'use client';
import { useState } from 'react';

export default function WeeklyStandupWidget({ commits, prsMerged, issuesClosed }: { commits: number, prsMerged: number, issuesClosed: number }) {
  const [standup, setStandup] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    setCopied(false);

    try {
      const res = await fetch('/api/ai/standup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commits, prsMerged, issuesClosed }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate update');
      }

      setStandup(data.standup);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(standup);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#0e0e0e] border border-[#161616] rounded-xl p-6 flex flex-col gap-4 text-white">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold">Weekly Standup Generator 🤖</h3>
        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 transition-colors px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {isLoading ? 'Generating...' : 'Generate Update'}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-lg">
          {error}
        </div>
      )}

      {standup && (
        <div className="mt-2 bg-[#161616] p-4 rounded-lg relative group">
          <p className="text-sm text-gray-300 whitespace-pre-wrap pr-12">{standup}</p>
          <button
            onClick={handleCopy}
            className="absolute top-3 right-3 bg-[#2a2a2a] hover:bg-[#333] text-xs px-3 py-1.5 rounded transition-all"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}
    </div>
  );
}
