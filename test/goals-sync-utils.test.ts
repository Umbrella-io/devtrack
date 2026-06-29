import { describe, it, expect } from "vitest";
import { extractValidRepoFromGoal } from "@/lib/goals-sync-utils";

describe("extractValidRepoFromGoal", () => {
  it("returns the repo when repo field is valid", () => {
    const goal = { id: "1", unit: "commits", repo: "facebook/react", repository: null, repo_name: null };
    expect(extractValidRepoFromGoal(goal)).toBe("facebook/react");
  });

  it("falls through to repository field when repo is null", () => {
    const goal = { id: "1", unit: "commits", repo: null, repository: "nodejs/node", repo_name: null };
    expect(extractValidRepoFromGoal(goal)).toBe("nodejs/node");
  });

  it("falls through to repo_name field when repo and repository are null", () => {
    const goal = { id: "1", unit: "commits", repo: null, repository: null, repo_name: "vitejs/vite" };
    expect(extractValidRepoFromGoal(goal)).toBe("vitejs/vite");
  });

  it("prioritizes repo over repository and repo_name", () => {
    const goal = { id: "1", unit: "commits", repo: "owner/repo", repository: "other/thing", repo_name: "another/thing" };
    expect(extractValidRepoFromGoal(goal)).toBe("owner/repo");
  });

  it("prioritizes repository over repo_name", () => {
    const goal = { id: "1", unit: "commits", repo: null, repository: "owner/repo", repo_name: "other/thing" };
    expect(extractValidRepoFromGoal(goal)).toBe("owner/repo");
  });

  it("trims whitespace from stored values", () => {
    const goal = { id: "1", unit: "commits", repo: "  owner/repo  ", repository: null, repo_name: null };
    expect(extractValidRepoFromGoal(goal)).toBe("owner/repo");
  });

  describe("returns null for invalid inputs", () => {
    it("returns null when all fields are null", () => {
      const goal = { id: "1", unit: "commits", repo: null, repository: null, repo_name: null };
      expect(extractValidRepoFromGoal(goal)).toBeNull();
    });

    it("returns null when all fields are empty strings", () => {
      const goal = { id: "1", unit: "commits", repo: "", repository: "", repo_name: "" };
      expect(extractValidRepoFromGoal(goal)).toBeNull();
    });

    it("returns null when repo field is invalid identifier", () => {
      const goal = { id: "1", unit: "commits", repo: "invalid repo", repository: null, repo_name: null };
      expect(extractValidRepoFromGoal(goal)).toBeNull();
    });

    it("returns null for dot-only repo name", () => {
      const goal = { id: "1", unit: "commits", repo: "owner/.", repository: null, repo_name: null };
      expect(extractValidRepoFromGoal(goal)).toBeNull();
    });

    it("returns null for dot-dot repo name", () => {
      const goal = { id: "1", unit: "commits", repo: "owner/..", repository: null, repo_name: null };
      expect(extractValidRepoFromGoal(goal)).toBeNull();
    });

    it("returns null for repo field that is not a string", () => {
      const goal = { id: "1", unit: "commits", repo: 123 as any, repository: null, repo_name: null };
      expect(extractValidRepoFromGoal(goal)).toBeNull();
    });
  });
});
