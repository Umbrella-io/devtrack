import { describe, it, expect } from "vitest";
import { extractValidRepoFromGoal, type ActivityGoal } from "@/lib/goals-sync-utils";

describe("extractValidRepoFromGoal", () => {
  it("returns owner/repo unchanged when repo field is valid", () => {
    const goal: ActivityGoal = { id: "1", unit: "commits", repo: "facebook/react", repository: null, repo_name: null };
    expect(extractValidRepoFromGoal(goal)).toBe("facebook/react");
  });

  it("returns repository field when repo is absent", () => {
    const goal: ActivityGoal = { id: "1", unit: "prs", repo: null, repository: "vercel/next.js", repo_name: null };
    expect(extractValidRepoFromGoal(goal)).toBe("vercel/next.js");
  });

  it("returns repo_name field when repo and repository are absent", () => {
    const goal: ActivityGoal = { id: "1", unit: "commits", repo: null, repository: null, repo_name: "golang/go" };
    expect(extractValidRepoFromGoal(goal)).toBe("golang/go");
  });

  it("prefers repo over repository and repo_name", () => {
    const goal: ActivityGoal = { id: "1", unit: "prs", repo: "tmdeveloper007/test", repository: "other/repo", repo_name: "another/repo" };
    expect(extractValidRepoFromGoal(goal)).toBe("tmdeveloper007/test");
  });

  it("returns null when all repo fields are null", () => {
    const goal: ActivityGoal = { id: "1", unit: "commits", repo: null, repository: null, repo_name: null };
    expect(extractValidRepoFromGoal(goal)).toBeNull();
  });

  it("returns null when repo field is undefined (treated as null)", () => {
    const goal = { id: "1", unit: "commits", repo: null, repository: null, repo_name: null } as ActivityGoal;
    expect(extractValidRepoFromGoal(goal)).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    const goal: ActivityGoal = { id: "1", unit: "commits", repo: "   ", repository: null, repo_name: null };
    expect(extractValidRepoFromGoal(goal)).toBeNull();
  });

  it("trims leading/trailing whitespace", () => {
    const goal: ActivityGoal = { id: "1", unit: "commits", repo: "  tmdeveloper007/test  ", repository: null, repo_name: null };
    expect(extractValidRepoFromGoal(goal)).toBe("tmdeveloper007/test");
  });

  it("returns null for string without slash", () => {
    const goal: ActivityGoal = { id: "1", unit: "commits", repo: "just-a-repo", repository: null, repo_name: null };
    expect(extractValidRepoFromGoal(goal)).toBeNull();
  });

  it("returns null for identifier with extra path segments", () => {
    const goal: ActivityGoal = { id: "1", unit: "commits", repo: "owner/repo/extra", repository: null, repo_name: null };
    expect(extractValidRepoFromGoal(goal)).toBeNull();
  });

  it("returns null when repo part is \".\"", () => {
    const goal: ActivityGoal = { id: "1", unit: "commits", repo: "owner/.", repository: null, repo_name: null };
    expect(extractValidRepoFromGoal(goal)).toBeNull();
  });

  it("returns null when repo part is \"..\"", () => {
    const goal: ActivityGoal = { id: "1", unit: "commits", repo: "owner/..", repository: null, repo_name: null };
    expect(extractValidRepoFromGoal(goal)).toBeNull();
  });

  it("returns null for non-string repo value (number)", () => {
    const goal = { id: "1", unit: "commits", repo: 123 as any, repository: null, repo_name: null };
    expect(extractValidRepoFromGoal(goal)).toBeNull();
  });

  it("returns null for non-string repo value (object)", () => {
    const goal = { id: "1", unit: "commits", repo: { raw: "owner/repo" } as any, repository: null, repo_name: null };
    expect(extractValidRepoFromGoal(goal)).toBeNull();
  });

  it("accepts repo with hyphens in owner and repo name", () => {
    const goal: ActivityGoal = { id: "1", unit: "commits", repo: "my-org/my-repo-name", repository: null, repo_name: null };
    expect(extractValidRepoFromGoal(goal)).toBe("my-org/my-repo-name");
  });

  it("accepts repo with dots and underscores in repo name", () => {
    const goal: ActivityGoal = { id: "1", unit: "prs", repo: "owner/my_repo.v2", repository: null, repo_name: null };
    expect(extractValidRepoFromGoal(goal)).toBe("owner/my_repo.v2");
  });
});
