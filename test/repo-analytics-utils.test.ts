import { describe, it, expect } from "vitest";
import { parseRepoParam } from "../src/lib/repo-analytics-utils";

describe("repo-analytics-utils", () => {
  describe("parseRepoParam", () => {
    it("parses a valid owner/repo", () => {
      const result = parseRepoParam("facebook/react");
      expect(result).toEqual({ owner: "facebook", repo: "react" });
    });

    it("parses owner with hyphens", () => {
      const result = parseRepoParam("my-org-name/my-repo-name");
      expect(result).toEqual({ owner: "my-org-name", repo: "my-repo-name" });
    });

    it("parses owner with underscores", () => {
      const result = parseRepoParam("tmdeveloper007/devtrack");
      expect(result).toEqual({ owner: "tmdeveloper007", repo: "devtrack" });
    });

    it("parses owner with numbers", () => {
      const result = parseRepoParam("google3/g3");
      expect(result).toEqual({ owner: "google3", repo: "g3" });
    });

    it("parses repo with dots", () => {
      const result = parseRepoParam("owner/repo.name");
      expect(result).toEqual({ owner: "owner", repo: "repo.name" });
    });

    it("parses repo with hyphens and underscores", () => {
      const result = parseRepoParam("owner/my_repo-v2");
      expect(result).toEqual({ owner: "owner", repo: "my_repo-v2" });
    });

    it("trims whitespace", () => {
      const result = parseRepoParam("  facebook/react  ");
      expect(result).toEqual({ owner: "facebook", repo: "react" });
    });

    it("returns null for empty string", () => {
      expect(parseRepoParam("")).toBeNull();
    });

    it("returns null for only whitespace", () => {
      expect(parseRepoParam("   ")).toBeNull();
    });

    it("returns null for missing slash", () => {
      expect(parseRepoParam("facebookreact")).toBeNull();
    });

    it("returns null for double slash", () => {
      expect(parseRepoParam("facebook/react/subpath")).toBeNull();
    });

    it("returns null for repo named .", () => {
      expect(parseRepoParam("owner/.")).toBeNull();
    });

    it("returns null for repo named ..", () => {
      expect(parseRepoParam("owner/..")).toBeNull();
    });

    it("returns null for owner starting with hyphen", () => {
      expect(parseRepoParam("-owner/repo")).toBeNull();
    });

    it("returns null for owner ending with hyphen", () => {
      expect(parseRepoParam("owner-/repo")).toBeNull();
    });

    it("handles owner with double hyphen", () => {
      // Double hyphen is technically allowed by the regex since -- is inside the {0,37} range
      const result = parseRepoParam("my--org/repo");
      expect(result).toEqual({ owner: "my--org", repo: "repo" });
    });

    it("handles single-character owner and repo", () => {
      const result = parseRepoParam("a/b");
      expect(result).toEqual({ owner: "a", repo: "b" });
    });

    it("handles mixed case", () => {
      const result = parseRepoParam("MyOrg/MyRepo");
      expect(result).toEqual({ owner: "MyOrg", repo: "MyRepo" });
    });
  });
});
