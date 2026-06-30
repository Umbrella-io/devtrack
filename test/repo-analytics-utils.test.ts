import { describe, it, expect } from "vitest";
import { parseRepoParam } from "@/lib/repo-analytics-utils";

describe("parseRepoParam", () => {
  describe("valid identifiers", () => {
    it("parses simple owner/repo", () => {
      expect(parseRepoParam("owner/repo")).toEqual({ owner: "owner", repo: "repo" });
    });

    it("parses hyphenated owner and repo", () => {
      expect(parseRepoParam("my-org/my-repo-name")).toEqual({ owner: "my-org", repo: "my-repo-name" });
    });

    it("parses repo with dots", () => {
      expect(parseRepoParam("owner/my_repo.v2")).toEqual({ owner: "owner", repo: "my_repo.v2" });
    });

    it("parses alphanumeric owner and repo", () => {
      expect(parseRepoParam("ABC123/XYZ789")).toEqual({ owner: "ABC123", repo: "XYZ789" });
    });

    it("trims whitespace", () => {
      expect(parseRepoParam("  owner/repo  ")).toEqual({ owner: "owner", repo: "repo" });
    });

    it("trims tab characters", () => {
      expect(parseRepoParam("\towner/repo\t")).toEqual({ owner: "owner", repo: "repo" });
    });
  });

  describe("rejects invalid identifiers", () => {
    it("returns null for empty string", () => {
      expect(parseRepoParam("")).toBeNull();
    });

    it("returns null for whitespace-only", () => {
      expect(parseRepoParam("   ")).toBeNull();
    });

    it("returns null for repo-only (no slash)", () => {
      expect(parseRepoParam("owner-repo")).toBeNull();
    });

    it("returns null for double slash", () => {
      expect(parseRepoParam("owner//repo")).toBeNull();
    });

    it("returns null for extra path segments", () => {
      expect(parseRepoParam("owner/repo/path")).toBeNull();
    });

    it("returns null for missing owner", () => {
      expect(parseRepoParam("/repo")).toBeNull();
    });

    it("returns null for missing repo", () => {
      expect(parseRepoParam("owner/")).toBeNull();
    });

    it("returns null for repo name with only dots", () => {
      expect(parseRepoParam("owner/.")).toBeNull();
    });

    it("returns null for repo name with double dots", () => {
      expect(parseRepoParam("owner/..")).toBeNull();
    });

    it("returns null when owner starts with hyphen", () => {
      expect(parseRepoParam("-owner/repo")).toBeNull();
    });

    it("returns null when owner ends with hyphen", () => {
      expect(parseRepoParam("owner-/repo")).toBeNull();
    });

    it("accepts single-character owner", () => {
      // The regex allows 1-char owner: [a-zA-Z0-9](?:...)?
      expect(parseRepoParam("a/repo")).toEqual({ owner: "a", repo: "repo" });
    });

    it("returns null for owner that is too long (>39 chars)", () => {
      const longOwner = "a".repeat(40) + "/repo";
      expect(parseRepoParam(longOwner)).toBeNull();
    });

    it("returns null for repo that is too long (>100 chars)", () => {
      const longRepo = "owner/" + "a".repeat(101);
      expect(parseRepoParam(longRepo)).toBeNull();
    });

    it("accepts single-character repo", () => {
      // The repo regex is [a-zA-Z0-9._-]{1,100}, min 1 char
      expect(parseRepoParam("owner/r")).toEqual({ owner: "owner", repo: "r" });
    });
  });
});
