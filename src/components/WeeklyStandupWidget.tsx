'use client';
import { useState } from 'react';

export default function WeeklyStandupWidget({ commits, prsMerged, issuesClosed }: { commits: number, prsMerged: number, issuesClosed: number }) {
  const [standup, setStandup] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/ai/standup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commits, prsMerged, issuesClosed }),
      });
      const data = await res.json();
      if (res.ok) setStandup(data.standup);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#0e0e0e] border border-[#161616] rounded-xl p-6 flex flex-col gap-4 text-white">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold">Weekly Standup Generator 🤖</h3>
        <button onClick={handleGenerate} disabled={isLoading} className="bg-blue-600 px-4 py-2 rounded-lg text-sm">
          {isLoading ? 'Generating...' : 'Generate Update'}
        </button>
      </div>
      {standup && (
        <div className="mt-2 bg-[#161616] p-4 rounded-lg">
          <p className="text-sm text-gray-300 whitespace-pre-wrap">{standup}</p>
        </div>
      )}
    </div>
  );
}
