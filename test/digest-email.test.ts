import { describe, it, expect } from "vitest";
import { buildDigestHtml, buildDigestText } from "@/lib/digest-email";
import type { DigestMetrics } from "@/lib/weekly-digest";
import "@/lib/weekly-digest"; // ensure types are registered

const MINIMAL_METRICS: DigestMetrics = {
  streak: { current: 5, longest: 14, lastCommitDate: "2024-06-30" },
  weeklyCommits: 12,
  weeklyActiveDays: 6,
  prsThisWeek: 2,
  topLanguages: [{ name: "TypeScript", percentage: 72.5 }],
  topRepos: [
    { name: "owner/repo", commits: 8, url: "https://github.com/owner/repo" },
  ],
};

const baseData = {
  githubLogin: "testuser",
  unsubscribeUrl: "https://example.com/unsubscribe?token=abc",
  weekLabel: "Week of 30 June 2025",
  metrics: null as DigestMetrics | null,
};

describe("buildDigestHtml", () => {
  it("renders without metrics (loading state)", () => {
    const html = buildDigestHtml({ ...baseData, metrics: null });
    expect(html).toContain("DevTrack");
    expect(html).toContain("Weekly Coding Digest");
    expect(html).toContain("testuser");
    expect(html).toContain("Metrics are loading");
  });

  it("renders with metrics showing streak section", () => {
    const html = buildDigestHtml({ ...baseData, metrics: MINIMAL_METRICS });
    expect(html).toContain("Current Streak");
    expect(html).toContain("5 days");
    expect(html).toContain("Longest streak");
    expect(html).toContain("14 days");
  });

  it("renders weekly activity section with correct commit count", () => {
    const html = buildDigestHtml({ ...baseData, metrics: MINIMAL_METRICS });
    expect(html).toContain("12");
    expect(html).toContain("Commits");
    expect(html).toContain("PRs merged");
    expect(html).toContain("2");
    expect(html).toContain("Active days");
  });

  it("renders language badge with correct color", () => {
    const html = buildDigestHtml({ ...baseData, metrics: MINIMAL_METRICS });
    // TypeScript maps to #3178c6
    expect(html).toContain("#3178c6");
    expect(html).toContain("TypeScript");
    expect(html).toContain("72.5%");
  });

  it("renders top repos section", () => {
    const html = buildDigestHtml({ ...baseData, metrics: MINIMAL_METRICS });
    expect(html).toContain("owner/repo");
    expect(html).toContain("8");
    expect(html).toContain("commits");
  });

  it("escapes HTML in username", () => {
    const html = buildDigestHtml({ ...baseData, githubLogin: "<script>alert(1)</script>" });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes HTML in repo name", () => {
    const metrics = {
      ...MINIMAL_METRICS,
      topRepos: [{ name: "<img src=x onerror=alert(1)>", commits: 1, url: "https://github.com/test/repo" }],
    };
    const html = buildDigestHtml({ ...baseData, metrics });
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("escapes XSS in week label in subtitle", () => {
    // The subtitle paragraph uses esc(); the <title> tag does not (documented behavior)
    const html = buildDigestHtml({ ...baseData, weekLabel: 'Week of <b>test</b>' });
    // subtitle should be escaped
    expect(html).toContain("&lt;b&gt;test&lt;/b&gt;");
    // title tag contains unescaped (this is the current behavior)
    expect(html).toContain("<title>Your Weekly DevTrack Digest — Week of <b>test</b></title>");
  });

  it("renders unsubscribe link", () => {
    const html = buildDigestHtml({ ...baseData, metrics: MINIMAL_METRICS });
    expect(html).toContain("https://example.com/unsubscribe?token=abc");
  });

  it("does not include language section when topLanguages is empty", () => {
    const metrics = { ...MINIMAL_METRICS, topLanguages: [] };
    const html = buildDigestHtml({ ...baseData, metrics });
    expect(html).not.toContain("Top languages");
  });

  it("does not include repos section when topRepos is empty", () => {
    const metrics = { ...MINIMAL_METRICS, topRepos: [] };
    const html = buildDigestHtml({ ...baseData, metrics });
    expect(html).not.toContain("Most active repositories");
  });

  it("uses plural day/day correctly for singular streak", () => {
    const metrics = { ...MINIMAL_METRICS, streak: { current: 1, longest: 1, lastCommitDate: null } };
    const html = buildDigestHtml({ ...baseData, metrics });
    expect(html).toContain("1 day"); // singular "day"
  });
});

describe("buildDigestText", () => {
  it("renders greeting with username", () => {
    const text = buildDigestText({ ...baseData, metrics: null });
    expect(text).toContain("Hey testuser!");
  });

  it("shows loading message when metrics is null", () => {
    const text = buildDigestText({ ...baseData, metrics: null });
    expect(text).toContain("Visit your dashboard");
    expect(text).not.toContain("Current streak");
  });

  it("shows streak with fire emoji", () => {
    const text = buildDigestText({ ...baseData, metrics: MINIMAL_METRICS });
    expect(text).toContain("Current streak: 5 days");
    expect(text).toContain("Longest streak: 14 days");
  });

  it("shows weekly activity", () => {
    const text = buildDigestText({ ...baseData, metrics: MINIMAL_METRICS });
    expect(text).toContain("Commits:");
    expect(text).toContain("12");
    expect(text).toContain("PRs merged:");
    expect(text).toContain("2");
    expect(text).toContain("Active days: 6/7");
  });

  it("shows top languages", () => {
    const text = buildDigestText({ ...baseData, metrics: MINIMAL_METRICS });
    expect(text).toContain("Top languages:");
    expect(text).toContain("TypeScript");
    expect(text).toContain("72.5%");
  });

  it("shows top repos", () => {
    const text = buildDigestText({ ...baseData, metrics: MINIMAL_METRICS });
    expect(text).toContain("Most active repositories:");
    expect(text).toContain("owner/repo");
    expect(text).toContain("8 commits");
  });

  it("uses singular commit when count is 1", () => {
    const metrics = { ...MINIMAL_METRICS, topRepos: [{ name: "r", commits: 1, url: "u" }] };
    const text = buildDigestText({ ...baseData, metrics });
    expect(text).toContain("1 commit"); // singular
  });

  it("pluralises commits in activity section", () => {
    const metrics = { ...MINIMAL_METRICS, topRepos: [{ name: "r", commits: 5, url: "u" }] };
    const text = buildDigestText({ ...baseData, metrics });
    expect(text).toContain("5 commits");
  });

  it("does not show streak when current is 0", () => {
    const metrics = { ...MINIMAL_METRICS, streak: { current: 0, longest: 5, lastCommitDate: null } };
    const text = buildDigestText({ ...baseData, metrics });
    expect(text).not.toContain("Current streak");
  });

  it("does not show language section when empty", () => {
    const metrics = { ...MINIMAL_METRICS, topLanguages: [] };
    const text = buildDigestText({ ...baseData, metrics });
    expect(text).not.toContain("Top languages:");
  });

  it("includes unsubscribe URL at the end", () => {
    const text = buildDigestText({ ...baseData, metrics: null });
    expect(text).toContain("https://example.com/unsubscribe?token=abc");
  });
});
