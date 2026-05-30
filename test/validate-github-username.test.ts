import { describe, expect, it } from "vitest";
import {
  isValidGitHubUsername,
  normalizeGitHubUsername,
} from "../src/lib/validate-github-username";

describe("isValidGitHubUsername", () => {
  it("accepts valid usernames", () => {
    expect(isValidGitHubUsername("octocat")).toBe(true);
    expect(isValidGitHubUsername("torvalds")).toBe(true);
    expect(isValidGitHubUsername("user-123")).toBe(true);
    expect(isValidGitHubUsername("A1B2C3")).toBe(true);
  });

  it("rejects usernames with invalid characters", () => {
    expect(isValidGitHubUsername("user_name")).toBe(false);
    expect(isValidGitHubUsername("user.name")).toBe(false);
    expect(isValidGitHubUsername("user@name")).toBe(false);
  });

  it("rejects usernames starting with a hyphen", () => {
    expect(isValidGitHubUsername("-octocat")).toBe(false);
  });

  it("rejects usernames ending with a hyphen", () => {
    expect(isValidGitHubUsername("octocat-")).toBe(false);
  });

  it("rejects empty usernames", () => {
    expect(isValidGitHubUsername("")).toBe(false);
  });

  it("rejects usernames longer than 39 characters", () => {
    expect(isValidGitHubUsername("a".repeat(40))).toBe(false);
  });

  it("accepts usernames with maximum valid length", () => {
    expect(isValidGitHubUsername("a".repeat(39))).toBe(true);
  });
});

describe("normalizeGitHubUsername", () => {
  it("returns trimmed valid username", () => {
    expect(normalizeGitHubUsername("  octocat  ")).toBe("octocat");
  });

  it("returns valid username unchanged", () => {
    expect(normalizeGitHubUsername("octocat")).toBe("octocat");
  });

  it("returns null for invalid usernames", () => {
    expect(normalizeGitHubUsername("user_name")).toBeNull();
    expect(normalizeGitHubUsername("-octocat")).toBeNull();
    expect(normalizeGitHubUsername("octocat-")).toBeNull();
  });

  it("returns null for empty strings", () => {
    expect(normalizeGitHubUsername("")).toBeNull();
  });

  it("returns null for whitespace-only strings", () => {
    expect(normalizeGitHubUsername("     ")).toBeNull();
  });

  it("returns null for null input", () => {
    expect(normalizeGitHubUsername(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(normalizeGitHubUsername(undefined)).toBeNull();
  });
});