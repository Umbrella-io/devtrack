import { describe, it, expect } from "vitest";
import { parseRepoParam } from "@/lib/repo-analytics-utils";

describe("repo-analytics-utils", () => {
  describe("parseRepoParam", () => {
    it("returns { owner, repo } for a valid owner/repo identifier", () => {
      expect(parseRepoParam("owner/repo")).toEqual({ owner: "owner", repo: "repo" });
    });

    it("trims leading and trailing whitespace", () => {
      expect(parseRepoParam("  owner/repo  ")).toEqual({ owner: "owner", repo: "repo" });
    });

    it("throws for null input (type signature is string, not string | null)", () => {
      expect(() => parseRepoParam(null as any)).toThrow();
    });

    it("throws for undefined input (type signature is string, not string | null)", () => {
      expect(() => parseRepoParam(undefined as any)).toThrow();
    });

    it("returns null for empty string", () => {
      expect(parseRepoParam("")).toBeNull();
    });

    it("returns null for whitespace-only string", () => {
      expect(parseRepoParam("   ")).toBeNull();
    });

    it("returns null for single-word identifier (no slash)", () => {
      expect(parseRepoParam("justareponame")).toBeNull();
    });

    it("returns null for identifier with extra path segments", () => {
      expect(parseRepoParam("owner/repo/extra")).toBeNull();
    });

    it("returns null for owner starting with hyphen", () => {
      expect(parseRepoParam("-owner/repo")).toBeNull();
    });

    it("returns null for owner ending with hyphen", () => {
      expect(parseRepoParam("owner-/repo")).toBeNull();
    });

    it("accepts repo name containing dots", () => {
      expect(parseRepoParam("owner/repo.name")).toEqual({ owner: "owner", repo: "repo.name" });
    });

    it("accepts repo name containing hyphens", () => {
      expect(parseRepoParam("owner/repo-name")).toEqual({ owner: "owner", repo: "repo-name" });
    });

    it("accepts repo name containing underscores", () => {
      expect(parseRepoParam("owner/repo_name")).toEqual({ owner: "owner", repo: "repo_name" });
    });

    it("returns null when repo is '.'", () => {
      expect(parseRepoParam("owner/.")).toBeNull();
    });

    it("returns null when repo is '..'", () => {
      expect(parseRepoParam("owner/..")).toBeNull();
    });

    it("accepts owner with hyphens in the middle", () => {
      expect(parseRepoParam("my-org/my-repo")).toEqual({ owner: "my-org", repo: "my-repo" });
    });

    it("returns null when owner exceeds 39 characters", () => {
      const longOwner = "a".repeat(40) + "/repo";
      expect(parseRepoParam(longOwner)).toBeNull();
    });

    it("accepts owner with exactly 39 characters", () => {
      const maxOwner = "a".repeat(39) + "/repo";
      expect(parseRepoParam(maxOwner)).toEqual({ owner: "a".repeat(39), repo: "repo" });
    });

    it("returns null when repo exceeds 100 characters", () => {
      const longRepo = "owner/" + "r".repeat(101);
      expect(parseRepoParam(longRepo)).toBeNull();
    });

    it("accepts repo with exactly 100 characters", () => {
      const maxRepo = "owner/" + "r".repeat(100);
      expect(parseRepoParam(maxRepo)).toEqual({ owner: "owner", repo: "r".repeat(100) });
    });

    it("accepts single-character owner and repo", () => {
      expect(parseRepoParam("a/b")).toEqual({ owner: "a", repo: "b" });
    });
  });
});
