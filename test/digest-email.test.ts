import { describe, it, expect } from "vitest";
import { buildDigestHtml, buildDigestText } from "../src/lib/digest-email";

const BASE_DATA = {
  githubLogin: "testuser",
  unsubscribeUrl: "https://example.com/unsubscribe?token=abc",
  weekLabel: "Week of 1 June 2026",
  metrics: null,
};

describe("digest-email", () => {
  describe("buildDigestHtml", () => {
    it("includes the githubLogin in the greeting", () => {
      const html = buildDigestHtml({ ...BASE_DATA, githubLogin: "Alice" });
      expect(html).toContain("Hey <strong>Alice</strong>");
    });

    it("includes the weekLabel in the title and header", () => {
      const html = buildDigestHtml({ ...BASE_DATA, weekLabel: "Week of 15 June 2026" });
      expect(html).toContain("Week of 15 June 2026");
    });

    it("includes the unsubscribeUrl in the footer", () => {
      const url = "https://example.com/unsubscribe?token=xyz";
      const html = buildDigestHtml({ ...BASE_DATA, unsubscribeUrl: url });
      expect(html).toContain(url);
    });

    it("renders fallback message when metrics is null", () => {
      const html = buildDigestHtml({ ...BASE_DATA, metrics: null });
      expect(html).toContain("Metrics are loading");
    });

    it("renders streak section when metrics present with streak", () => {
      const html = buildDigestHtml({
        ...BASE_DATA,
        metrics: {
          streak: { current: 5, longest: 10 },
          weeklyCommits: 20,
          prsThisWeek: 3,
          weeklyActiveDays: 4,
          topLanguages: [],
          topRepos: [],
        },
      });
      expect(html).toContain("Current Streak");
      expect(html).toContain("5 days");
    });

    it("renders weekly activity section with correct commit count", () => {
      const html = buildDigestHtml({
        ...BASE_DATA,
        metrics: {
          streak: { current: 0, longest: 0 },
          weeklyCommits: 42,
          prsThisWeek: 2,
          weeklyActiveDays: 3,
          topLanguages: [],
          topRepos: [],
        },
      });
      expect(html).toContain("42");
      expect(html).toContain("PRs merged");
      // weeklyActiveDays is rendered as "3" followed by span with "/7"
      expect(html).toContain("3");
      expect(html).toContain("/7");
    });

    it("renders top languages section when languages are present", () => {
      const html = buildDigestHtml({
        ...BASE_DATA,
        metrics: {
          streak: { current: 0, longest: 0 },
          weeklyCommits: 10,
          prsThisWeek: 1,
          weeklyActiveDays: 2,
          topLanguages: [{ name: "TypeScript", percentage: 80.5 }],
          topRepos: [],
        },
      });
      expect(html).toContain("Top languages");
      expect(html).toContain("TypeScript");
    });

    it("renders top repos section when repos are present", () => {
      const html = buildDigestHtml({
        ...BASE_DATA,
        metrics: {
          streak: { current: 0, longest: 0 },
          weeklyCommits: 10,
          prsThisWeek: 1,
          weeklyActiveDays: 2,
          topLanguages: [],
          topRepos: [{ name: "my-project", commits: 5, url: "https://github.com/test/my-project" }],
        },
      });
      expect(html).toContain("Most active repositories");
      expect(html).toContain("my-project");
    });

    it("escapes HTML in githubLogin", () => {
      const html = buildDigestHtml({ ...BASE_DATA, githubLogin: "<script>alert(1)</script>" });
      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;script&gt;");
    });

    it("escapes HTML in repository names", () => {
      const html = buildDigestHtml({
        ...BASE_DATA,
        metrics: {
          streak: { current: 0, longest: 0 },
          weeklyCommits: 10,
          prsThisWeek: 1,
          weeklyActiveDays: 2,
          topLanguages: [],
          topRepos: [{ name: "<b>bold</b>", commits: 3, url: "https://github.com/test/repo" }],
        },
      });
      expect(html).not.toContain("<b>bold</b>");
    });
  });

  describe("buildDigestText", () => {
    it("includes the githubLogin in greeting", () => {
      const text = buildDigestText({ ...BASE_DATA, githubLogin: "Bob" });
      expect(text).toContain("Hey Bob!");
    });

    it("includes the weekLabel", () => {
      const text = buildDigestText({ ...BASE_DATA, weekLabel: "Week of 1 June 2026" });
      expect(text).toContain("Week of 1 June 2026");
    });

    it("includes the unsubscribeUrl", () => {
      const url = "https://example.com/unsubscribe?token=xyz";
      const text = buildDigestText({ ...BASE_DATA, unsubscribeUrl: url });
      expect(text).toContain(url);
    });

    it("renders fallback message when metrics is null", () => {
      const text = buildDigestText({ ...BASE_DATA, metrics: null });
      expect(text).toContain("Visit your dashboard");
    });

    it("renders streak with emoji when current streak > 0", () => {
      const text = buildDigestText({
        ...BASE_DATA,
        metrics: {
          streak: { current: 7, longest: 14 },
          weeklyCommits: 10,
          prsThisWeek: 2,
          weeklyActiveDays: 5,
          topLanguages: [],
          topRepos: [],
        },
      });
      expect(text).toContain("Current streak: 7 days");
      expect(text).toContain("Longest streak: 14 days");
    });

    it("renders weekly activity with correct values", () => {
      const text = buildDigestText({
        ...BASE_DATA,
        metrics: {
          streak: { current: 0, longest: 0 },
          weeklyCommits: 15,
          prsThisWeek: 4,
          weeklyActiveDays: 6,
          topLanguages: [],
          topRepos: [],
        },
      });
      expect(text).toContain("Commits:    15");
      expect(text).toContain("PRs merged: 4");
      expect(text).toContain("Active days: 6/7");
    });

    it("renders top languages with percentages", () => {
      const text = buildDigestText({
        ...BASE_DATA,
        metrics: {
          streak: { current: 0, longest: 0 },
          weeklyCommits: 10,
          prsThisWeek: 1,
          weeklyActiveDays: 2,
          topLanguages: [
            { name: "Rust", percentage: 60.0 },
            { name: "Go", percentage: 40.0 },
          ],
          topRepos: [],
        },
      });
      expect(text).toContain("Top languages:");
      // Language name and percentage appear in the text (padding may vary)
      expect(text).toContain("Rust");
      expect(text).toContain("60.0%");
    });

    it("renders top repos with commit counts", () => {
      const text = buildDigestText({
        ...BASE_DATA,
        metrics: {
          streak: { current: 0, longest: 0 },
          weeklyCommits: 10,
          prsThisWeek: 1,
          weeklyActiveDays: 2,
          topLanguages: [],
          topRepos: [
            { name: "proj-a", commits: 5, url: "https://github.com/test/proj-a" },
            { name: "proj-b", commits: 3, url: "https://github.com/test/proj-b" },
          ],
        },
      });
      expect(text).toContain("Most active repositories:");
      expect(text).toContain("1. proj-a");
      expect(text).toContain("2. proj-b");
    });
  });
});
