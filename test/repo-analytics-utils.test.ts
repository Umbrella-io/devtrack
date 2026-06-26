import { describe, it, expect } from "vitest";
import { parseRepoParam, type ParsedRepo } from "@/lib/repo-analytics-utils";

describe("parseRepoParam", () => {
  it("parses a simple owner/repo", () => {
    expect(parseRepoParam("facebook/react")).toEqual({ owner: "facebook", repo: "react" });
  });

  it("parses owner with hyphen", () => {
    expect(parseRepoParam("my-org/my-repo")).toEqual({ owner: "my-org", repo: "my-repo" });
  });

  it("parses owner with numbers", () => {
    expect(parseRepoParam("org123/repo456")).toEqual({ owner: "org123", repo: "repo456" });
  });

  it("parses repo with dots", () => {
    expect(parseRepoParam("owner/repo.name")).toEqual({ owner: "owner", repo: "repo.name" });
  });

  it("parses repo with underscores", () => {
    expect(parseRepoParam("owner/repo_name")).toEqual({ owner: "owner", repo: "repo_name" });
  });

  it("parses repo with hyphens", () => {
    expect(parseRepoParam("owner/repo-name-v2")).toEqual({ owner: "owner", repo: "repo-name-v2" });
  });

  it("trims leading whitespace", () => {
    expect(parseRepoParam("  owner/repo")).toEqual({ owner: "owner", repo: "repo" });
  });

  it("trims trailing whitespace", () => {
    expect(parseRepoParam("owner/repo  ")).toEqual({ owner: "owner", repo: "repo" });
  });

  it("trims both leading and trailing whitespace", () => {
    expect(parseRepoParam("  owner/repo  ")).toEqual({ owner: "owner", repo: "repo" });
  });

  it("returns null for null input", () => {
    expect(parseRepoParam(null as any)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(parseRepoParam(undefined as any)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseRepoParam("")).toBeNull();
  });

  it("returns null for string with only whitespace", () => {
    expect(parseRepoParam("   ")).toBeNull();
  });

  it("returns null for no slash", () => {
    expect(parseRepoParam("just-a-repo")).toBeNull();
  });

  it("returns null for extra path segments", () => {
    expect(parseRepoParam("owner/repo/extra")).toBeNull();
  });

  it("returns null for extra path segments after slash", () => {
    expect(parseRepoParam("owner/repo/foo/bar")).toBeNull();
  });

  it("returns null when repo part is \".\"", () => {
    expect(parseRepoParam("owner/.")).toBeNull();
  });

  it("returns null when repo part is \"..\"", () => {
    expect(parseRepoParam("owner/..")).toBeNull();
  });

  it("accepts maximum-length owner (39 chars alphanumeric)", () => {
    const owner = "a".repeat(38) + "a";
    expect(parseRepoParam(`${owner}/repo`)).toEqual({ owner, repo: "repo" });
  });

  it("accepts maximum-length repo (100 chars)", () => {
    const repo = "a".repeat(100);
    expect(parseRepoParam(`owner/${repo}`)).toEqual({ owner: "owner", repo });
  });

  it("returns null for owner starting with hyphen", () => {
    expect(parseRepoParam("-owner/repo")).toBeNull();
  });

  it("returns null for owner ending with hyphen", () => {
    expect(parseRepoParam("owner-/repo")).toBeNull();
  });

  it("accepts single-char owner", () => {
    expect(parseRepoParam("a/repo")).toEqual({ owner: "a", repo: "repo" });
  });

  it("accepts single-char repo", () => {
    expect(parseRepoParam("owner/r")).toEqual({ owner: "owner", repo: "r" });
  });

  it("returns null for missing owner", () => {
    expect(parseRepoParam("/repo")).toBeNull();
  });

  it("returns null for missing repo", () => {
    expect(parseRepoParam("owner/")).toBeNull();
  });
});
