"use client";

import { useState } from "react";
import CharacterForm, { type CharacterConfig } from "@/components/CharacterForm";
import { buildStoryPrompt } from "@/lib/promptBuilder";

export default function StoryGenerator() {
  const [story, setStory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (config: CharacterConfig) => {
    setIsLoading(true);
    setError(null);
    setStory(null);

    const prompt = buildStoryPrompt(config);

    try {
      const res = await fetch("/api/ai-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) throw new Error("Failed to generate story.");
      const data = await res.json();
      setStory(data.story ?? data.result ?? "No story returned.");
    } catch {
      setError("Story generation failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <CharacterForm onSubmit={handleGenerate} isLoading={isLoading} />

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {story && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm space-y-2">
          <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
            ✦ Generated Story
          </h3>
          <p className="text-sm text-[var(--card-foreground)] leading-relaxed whitespace-pre-wrap">
            {story}
          </p>
        </div>
      )}
    </div>
  );
}