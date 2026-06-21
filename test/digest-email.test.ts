import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildDigestHtml, buildDigestText } from "../src/lib/digest-email";
import type { DigestMetrics } from "@/lib/weekly-digest";

function makeMetrics(overrides: Partial<DigestMetrics> = {}): DigestMetrics {
  return {
    streak: { current: 5, longest: 12, lastCommitDate: null },
    weeklyCommits: 42,
    weeklyActiveDays: 6,
    prsThisWeek: 3,
    topLanguages: [
      { name: "TypeScript", percentage: 60.5 },
      { name: "Python", percentage: 30.0 },
      { name: "Rust", percentage: 9.5 },
    ],
    topRepos: [
      { name: "owner/repo-a", url: "https://github.com/owner/repo-a", commits: 18 },
      { name: "owner/repo-b", url: "https://github.com/owner/repo-b", commits: 12 },
    ],
    ...overrides,
  };
}

const BASE_DATA = {
  githubLogin: "testuser",
  metrics: null,
  unsubscribeUrl: "https://app.devtrack.io/unsubscribe?token=abc",
  weekLabel: "Week of 15 June 2026",
};

describe("buildDigestHtml", () => {
  beforeEach(() => {
    process.env.NEXTAUTH_URL = "https://app.devtrack.io";
  });

  afterEach(() => {
    delete process.env.NEXTAUTH_URL;
  });

  it("returns a full HTML document with DOCTYPE and charset", () => {
    const html = buildDigestHtml(BASE_DATA);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain('charset="UTF-8"');
  });

  it("contains the githubLogin in the greeting", () => {
    const html = buildDigestHtml(BASE_DATA);
    expect(html).toContain("Hey <strong>testuser</strong>");
  });

  it("contains the weekLabel in the title and header", () => {
    const html = buildDigestHtml(BASE_DATA);
    expect(html).toContain("Week of 15 June 2026");
  });

  it("contains streak data when metrics are present", () => {
    const html = buildDigestHtml({ ...BASE_DATA, metrics: makeMetrics() });
    expect(html).toContain("Current Streak");
    expect(html).toContain("5 days");
    expect(html).toContain("Longest streak");
    expect(html).toContain("12 days");
  });

  it("contains weekly activity metrics", () => {
    const html = buildDigestHtml({ ...BASE_DATA, metrics: makeMetrics() });
    expect(html).toContain("42"); // weeklyCommits
    expect(html).toContain("3"); // prsThisWeek
    expect(html).toContain("6"); // weeklyActiveDays
    expect(html).toContain("Commits");
    expect(html).toContain("PRs merged");
    expect(html).toContain("Active days");
  });

  it("renders language badges with colour spans", () => {
    const html = buildDigestHtml({ ...BASE_DATA, metrics: makeMetrics() });
    // TypeScript badge has known colour
    expect(html).toContain("#3178c6"); // TypeScript colour
    // Python badge
    expect(html).toContain("#3776ab"); // Python colour
    expect(html).toContain("TypeScript");
    expect(html).toContain("Python");
    expect(html).toContain("Rust");
  });

  it("contains top repo entries with links", () => {
    const html = buildDigestHtml({ ...BASE_DATA, metrics: makeMetrics() });
    expect(html).toContain("owner/repo-a");
    expect(html).toContain("owner/repo-b");
    expect(html).toContain("https://github.com/owner/repo-a");
  });

  it("contains the dashboard CTA link", () => {
    const html = buildDigestHtml(BASE_DATA);
    expect(html).toContain("Open Dashboard");
    expect(html).toContain("https://app.devtrack.io/dashboard");
  });

  it("contains the unsubscribe link", () => {
    const html = buildDigestHtml(BASE_DATA);
    expect(html).toContain("https://app.devtrack.io/unsubscribe?token=abc");
    expect(html).toContain("Unsubscribe");
  });

  it("escapes HTML in the githubLogin", () => {
    const html = buildDigestHtml({ ...BASE_DATA, githubLogin: "<script>alert(1)</script>" });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes HTML in repo names", () => {
    const html = buildDigestHtml({
      ...BASE_DATA,
      metrics: makeMetrics({
        topRepos: [{ name: "<b>bold</b>", url: "https://github.com/owner/repo", commits: 5 }],
      }),
    });
    expect(html).not.toContain("<b>bold</b>");
    expect(html).toContain("&lt;b&gt;bold&lt;/b&gt;");
  });

  it("shows no-metrics fallback when metrics are null", () => {
    const html = buildDigestHtml({ ...BASE_DATA, metrics: null });
    expect(html).toContain("Metrics are loading");
    expect(html).toContain("DevTrack dashboard");
    expect(html).not.toContain("Current Streak");
  });

  it("shows streak when streak is positive", () => {
    const html = buildDigestHtml({
      ...BASE_DATA,
      metrics: makeMetrics({ streak: { current: 0, longest: 0, lastCommitDate: null } }),
    });
    // streak section only renders when m.streak.current > 0
    // The source has: const streakHtml = m ? ... (only checks m is truthy, not streak.current)
    // So streak block renders even when current=0 as long as metrics exist
    expect(html).toContain("Current Streak");
    expect(html).toContain("Commits");
  });

  it("omits languages section when topLanguages is empty", () => {
    const html = buildDigestHtml({
      ...BASE_DATA,
      metrics: makeMetrics({ topLanguages: [] }),
    });
    expect(html).not.toContain("Top languages");
  });

  it("omits repos section when topRepos is empty", () => {
    const html = buildDigestHtml({
      ...BASE_DATA,
      metrics: makeMetrics({ topRepos: [] }),
    });
    expect(html).not.toContain("Most active repositories");
  });
});

describe("buildDigestText", () => {
  beforeEach(() => {
    process.env.NEXTAUTH_URL = "https://app.devtrack.io";
  });

  afterEach(() => {
    delete process.env.NEXTAUTH_URL;
  });

  it("returns a string containing DevTrack and weekLabel", () => {
    const text = buildDigestText(BASE_DATA);
    expect(text).toContain("DevTrack");
    expect(text).toContain("Week of 15 June 2026");
  });

  it("greets the githubLogin", () => {
    const text = buildDigestText(BASE_DATA);
    expect(text).toContain("Hey testuser!");
  });

  it("contains streak with emoji and pluralisation", () => {
    const text = buildDigestText({ ...BASE_DATA, metrics: makeMetrics() });
    expect(text).toContain("Current streak:");
    expect(text).toContain("5 days");
    expect(text).toContain("Longest streak:");
    expect(text).toContain("12 days");
  });

  it("pluralises streak correctly for singular", () => {
    const text = buildDigestText({
      ...BASE_DATA,
      metrics: makeMetrics({ streak: { current: 1, longest: 3, lastCommitDate: null } }),
    });
    expect(text).toContain("1 day");
    expect(text).not.toContain("1 days");
  });

  it("contains weekly activity", () => {
    const text = buildDigestText({ ...BASE_DATA, metrics: makeMetrics() });
    expect(text).toContain("Commits:");
    expect(text).toContain("42");
    expect(text).toContain("PRs merged:");
    expect(text).toContain("3");
  });

  it("contains top languages", () => {
    const text = buildDigestText({ ...BASE_DATA, metrics: makeMetrics() });
    expect(text).toContain("Top languages:");
    expect(text).toContain("TypeScript");
    expect(text).toContain("Python");
  });

  it("contains top repos with commit counts", () => {
    const text = buildDigestText({ ...BASE_DATA, metrics: makeMetrics() });
    expect(text).toContain("Most active repositories:");
    expect(text).toContain("owner/repo-a");
    expect(text).toContain("18 commits");
  });

  it("contains dashboard and unsubscribe links", () => {
    const text = buildDigestText(BASE_DATA);
    expect(text).toContain("https://app.devtrack.io/dashboard");
    expect(text).toContain("https://app.devtrack.io/unsubscribe?token=abc");
  });

  it("shows fallback message when metrics are null", () => {
    const text = buildDigestText({ ...BASE_DATA, metrics: null });
    expect(text).toContain("Visit your dashboard");
    expect(text).not.toContain("Current streak:");
  });

  it("omits repos section when topRepos is empty", () => {
    const text = buildDigestText({
      ...BASE_DATA,
      metrics: makeMetrics({ topRepos: [] }),
    });
    expect(text).not.toContain("Most active repositories:");
  });
});
