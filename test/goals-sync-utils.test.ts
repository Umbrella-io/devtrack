import { describe, it, expect } from "vitest";
import { extractValidRepoFromGoal } from "../src/lib/goals-sync-utils";

describe("goals-sync-utils", () => {
  describe("extractValidRepoFromGoal", () => {
    it("extracts valid repo from 'repo' field", () => {
      const goal = { id: "1", unit: "commits", repo: "facebook/react", repository: null, repo_name: null };
      expect(extractValidRepoFromGoal(goal)).toBe("facebook/react");
    });

    it("extracts valid repo from 'repository' field when 'repo' is absent", () => {
      const goal = { id: "2", unit: "prs", repo: null, repository: "tmdeveloper007/devtrack", repo_name: null };
      expect(extractValidRepoFromGoal(goal)).toBe("tmdeveloper007/devtrack");
    });

    it("extracts valid repo from 'repo_name' field when 'repo' and 'repository' are absent", () => {
      const goal = { id: "3", unit: "commits", repo: null, repository: null, repo_name: "owner/my-repo" };
      expect(extractValidRepoFromGoal(goal)).toBe("owner/my-repo");
    });

    it("prefers 'repo' over 'repository' when both are present", () => {
      const goal = { id: "4", unit: "commits", repo: "preferred/repo", repository: "other/repo", repo_name: null };
      expect(extractValidRepoFromGoal(goal)).toBe("preferred/repo");
    });

    it("prefers 'repo' over 'repo_name' when both are present", () => {
      const goal = { id: "5", unit: "commits", repo: "preferred/repo", repository: null, repo_name: "other/repo" };
      expect(extractValidRepoFromGoal(goal)).toBe("preferred/repo");
    });

    it("returns null when all fields are null", () => {
      const goal = { id: "6", unit: "commits", repo: null, repository: null, repo_name: null };
      expect(extractValidRepoFromGoal(goal)).toBeNull();
    });

    it("returns null when all fields are undefined", () => {
      const goal = { id: "7", unit: "commits", repo: undefined, repository: undefined, repo_name: undefined } as any;
      expect(extractValidRepoFromGoal(goal)).toBeNull();
    });

    it("returns null when field is empty string", () => {
      const goal = { id: "8", unit: "commits", repo: "", repository: null, repo_name: null };
      expect(extractValidRepoFromGoal(goal)).toBeNull();
    });

    it("returns null when field is whitespace", () => {
      const goal = { id: "9", unit: "commits", repo: "   ", repository: null, repo_name: null };
      expect(extractValidRepoFromGoal(goal)).toBeNull();
    });

    it("returns null for invalid repo format (missing slash)", () => {
      const goal = { id: "10", unit: "commits", repo: "invalid-reponame", repository: null, repo_name: null };
      expect(extractValidRepoFromGoal(goal)).toBeNull();
    });

    it("returns null for invalid repo (dot separator)", () => {
      const goal = { id: "11", unit: "commits", repo: "owner/.", repository: null, repo_name: null };
      expect(extractValidRepoFromGoal(goal)).toBeNull();
    });

    it("returns null for invalid repo (double dot separator)", () => {
      const goal = { id: "12", unit: "commits", repo: "owner/..", repository: null, repo_name: null };
      expect(extractValidRepoFromGoal(goal)).toBeNull();
    });

    it("trims whitespace from repo value", () => {
      const goal = { id: "13", unit: "commits", repo: "  facebook/react  ", repository: null, repo_name: null };
      expect(extractValidRepoFromGoal(goal)).toBe("facebook/react");
    });

    it("handles repo with hyphens in owner and repo", () => {
      const goal = { id: "14", unit: "commits", repo: "my-org-name/my-repo-v2", repository: null, repo_name: null };
      expect(extractValidRepoFromGoal(goal)).toBe("my-org-name/my-repo-v2");
    });

    it("handles repo with underscores", () => {
      const goal = { id: "15", unit: "commits", repo: "tmdeveloper007/my_repo", repository: null, repo_name: null };
      expect(extractValidRepoFromGoal(goal)).toBe("tmdeveloper007/my_repo");
    });
  });
});
