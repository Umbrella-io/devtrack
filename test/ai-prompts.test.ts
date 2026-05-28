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

  it("handles zero values correctly", () => {
    const prompt = weeklyProductivityPrompt({
      activeDays: 0,
      currentStreak: 0,
      totalCommits: 0,
      prsMerged: 0,
      prsOpen: 0,
      avgMergeTimeDays: 0,
      topRepoName: "none",
      trendLabel: "0%",
    });

    expect(prompt).toContain("Active coding days: 0");
    expect(prompt).toContain("Total commits (90d): 0");
    expect(prompt).toContain("PRs merged: 0, open: 0");
  });

  it("handles large numbers correctly", () => {
    const prompt = weeklyProductivityPrompt({
      activeDays: 30,
      currentStreak: 365,
      totalCommits: 99999,
      prsMerged: 500,
      prsOpen: 50,
      avgMergeTimeDays: 0.5,
      topRepoName: "massive-repo",
      trendLabel: "+999%",
    });

    expect(prompt).toContain("Total commits (90d): 99999");
    expect(prompt).toContain("PRs merged: 500");
  });

  it("handles negative streak values", () => {
    const prompt = weeklyProductivityPrompt({
      activeDays: 2,
      currentStreak: -5,
      totalCommits: 15,
      prsMerged: 1,
      prsOpen: 2,
      avgMergeTimeDays: 1.0,
      topRepoName: "test-repo",
      trendLabel: "-10%",
    });

    expect(prompt).toContain("Current streak: -5 days");
  });

  it("handles empty string for topRepoName", () => {
    const prompt = weeklyProductivityPrompt({
      activeDays: 3,
      currentStreak: 5,
      totalCommits: 20,
      prsMerged: 2,
      prsOpen: 1,
      avgMergeTimeDays: 1.5,
      topRepoName: "",
      trendLabel: "+5%",
    });

    expect(prompt).toContain("Top repository: ");
  });
});
