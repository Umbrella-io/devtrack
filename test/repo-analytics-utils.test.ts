import { describe, it, expect } from "vitest";
import { parseRepoParam } from "../src/lib/repo-analytics-utils";

describe("parseRepoParam", () => {
  it("returns owner and repo for a valid identifier", () => {
    const result = parseRepoParam("facebook/react");
    expect(result).toEqual({ owner: "facebook", repo: "react" });
  });

  it("returns owner and repo for a name with dots", () => {
    const result = parseRepoParam("vercel/next.js");
    expect(result).toEqual({ owner: "vercel", repo: "next.js" });
  });

  it("returns owner and repo for a name with hyphens and underscores", () => {
    const result = parseRepoParam("owner-name/repo_name-v2");
    expect(result).toEqual({ owner: "owner-name", repo: "repo_name-v2" });
  });

  it("trims whitespace", () => {
    const result = parseRepoParam("  owner/repo  ");
    expect(result).toEqual({ owner: "owner", repo: "repo" });
  });

  it("handles single-character owner and repo", () => {
    const result = parseRepoParam("a/b");
    expect(result).toEqual({ owner: "a", repo: "b" });
  });

  it("returns null for missing slash", () => {
    expect(parseRepoParam("justareponame")).toBeNull();
  });

  it("returns null for empty owner", () => {
    expect(parseRepoParam("/repo")).toBeNull();
  });

  it("returns null for empty repo", () => {
    expect(parseRepoParam("owner/")).toBeNull();
  });

  it("returns null for owner starting with hyphen", () => {
    expect(parseRepoParam("-owner/repo")).toBeNull();
  });

  it("returns null for owner ending with hyphen", () => {
    expect(parseRepoParam("owner-/repo")).toBeNull();
  });

  it("accepts repo starting with hyphen", () => {
    // The regex allows hyphens anywhere in the repo name
    expect(parseRepoParam("owner/-repo")).toEqual({ owner: "owner", repo: "-repo" });
  });

  it("accepts repo ending with hyphen", () => {
    expect(parseRepoParam("owner/repo-")).toEqual({ owner: "owner", repo: "repo-" });
  });

  it("returns null for dot-only repo (. and ..)", () => {
    expect(parseRepoParam("owner/.")).toBeNull();
    expect(parseRepoParam("owner/..")).toBeNull();
  });

  it("returns null for extra slashes", () => {
    expect(parseRepoParam("owner/repo/extra")).toBeNull();
    expect(parseRepoParam("owner/repo/path/segment")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseRepoParam("")).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    expect(parseRepoParam("   ")).toBeNull();
  });

  it("returns null for owner exceeding 39 characters", () => {
    const longOwner = "a".repeat(40) + "/repo";
    expect(parseRepoParam(longOwner)).toBeNull();
  });

  it("returns null for repo exceeding 100 characters", () => {
    const longRepo = "owner/" + "a".repeat(101);
    expect(parseRepoParam(longRepo)).toBeNull();
  });

  it("accepts owner at exactly 39 characters", () => {
    const maxOwner = "a".repeat(39) + "/repo";
    const result = parseRepoParam(maxOwner);
    expect(result).toEqual({ owner: "a".repeat(39), repo: "repo" });
  });

  it("accepts repo at exactly 100 characters", () => {
    const maxRepo = "owner/" + "a".repeat(100);
    const result = parseRepoParam(maxRepo);
    expect(result).toEqual({ owner: "owner", repo: "a".repeat(100) });
  });
});
