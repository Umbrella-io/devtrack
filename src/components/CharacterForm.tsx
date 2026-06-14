"use client";

import { useState } from "react";

export interface CharacterConfig {
  heroName: string;
  villainName: string;
  setting: string;
  mood: string;
}

interface CharacterFormProps {
  onSubmit: (config: CharacterConfig) => void;
  isLoading?: boolean;
}

export default function CharacterForm({ onSubmit, isLoading }: CharacterFormProps) {
  const [heroName, setHeroName] = useState("");
  const [villainName, setVillainName] = useState("");
  const [setting, setSetting] = useState("");
  const [mood, setMood] = useState("");

  const handleSubmit = () => {
    onSubmit({
      heroName: heroName.trim() || "Alex",
      villainName: villainName.trim() || "Shadow",
      setting: setting.trim() || "a mysterious forest",
      mood: mood.trim() || "adventurous",
    });
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-[var(--card-foreground)]">
          ✦ Customize Your Story
        </h2>
        <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
          Fill in the fields below or leave blank to use defaults.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--muted-foreground)]">
            Hero Name
          </label>
          <input
            type="text"
            value={heroName}
            onChange={(e) => setHeroName(e.target.value)}
            placeholder="Alex"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--muted-foreground)]">
            Villain Name
          </label>
          <input
            type="text"
            value={villainName}
            onChange={(e) => setVillainName(e.target.value)}
            placeholder="Shadow"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--muted-foreground)]">
            Setting
          </label>
          <input
            type="text"
            value={setting}
            onChange={(e) => setSetting(e.target.value)}
            placeholder="Medieval castle"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--muted-foreground)]">
            Mood
          </label>
          <input
            type="text"
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            placeholder="Dark & mysterious"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={isLoading}
        className="w-full rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Generating story..." : "✦ Generate Story"}
      </button>
    </div>
  );
}