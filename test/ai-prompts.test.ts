import { describe, it, expect } from "vitest";
import { weeklyProductivityPrompt } from "@/lib/ai-prompts";

describe("weeklyProductivityPrompt", () => {
  it("generates a prompt correctly with the provided metrics", () => {
    const prompt = weeklyProductivityPrompt({
      activeDays: 5,
      currentStreak: 7,
      totalCommits: 42,
      prsMerged: 3,
      prsOpen: 1,
      avgMergeTimeDays: 2.5,
      topRepoName: "devtrack",
      trendLabel: "+15%",
    });

    expect(prompt).toContain("Active coding days: 5");
    expect(prompt).toContain("Current streak: 7 days");
    expect(prompt).toContain("Total commits (90d): 42");
    expect(prompt).toContain("PRs merged: 3, open: 1");
    expect(prompt).toContain("Avg PR merge time: 2.5 days");
    expect(prompt).toContain("Top repository: devtrack");
    expect(prompt).toContain("Activity trend: +15% vs prior period");
    expect(prompt).toContain("Write a warm, concise 3-sentence weekly summary.");
  });
});
