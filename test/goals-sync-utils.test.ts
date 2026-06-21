import { describe, it, expect } from "vitest";
import { extractValidRepoFromGoal } from "../src/lib/goals-sync-utils";

function makeGoal(partial: {
  repo?: string | null;
  repository?: string | null;
  repo_name?: string | null;
  id?: string;
  unit?: string;
}): { id: string; unit: string; repo: string | null; repository: string | null; repo_name: string | null } {
  return {
    id: partial.id ?? "goal-1",
    unit: partial.unit ?? "commits",
    repo: partial.repo ?? null,
    repository: partial.repository ?? null,
    repo_name: partial.repo_name ?? null,
  };
}

describe("extractValidRepoFromGoal", () => {
  it("returns owner/repo for a valid repo field", () => {
    const goal = makeGoal({ repo: "facebook/react" });
    expect(extractValidRepoFromGoal(goal)).toBe("facebook/react");
  });

  it("returns owner/repo for a valid repository field", () => {
    const goal = makeGoal({ repository: "vercel/next.js" });
    expect(extractValidRepoFromGoal(goal)).toBe("vercel/next.js");
  });

  it("returns owner/repo for a valid repo_name field", () => {
    const goal = makeGoal({ repo_name: "microsoft/vscode" });
    expect(extractValidRepoFromGoal(goal)).toBe("microsoft/vscode");
  });

  it("prefers repo over repository and repo_name", () => {
    const goal = makeGoal({ repo: "a/b", repository: "x/y", repo_name: "p/q" });
    expect(extractValidRepoFromGoal(goal)).toBe("a/b");
  });

  it("prefers repository over repo_name when repo is absent", () => {
    const goal = makeGoal({ repository: "x/y", repo_name: "p/q" });
    expect(extractValidRepoFromGoal(goal)).toBe("x/y");
  });

  it("trims whitespace from the value", () => {
    const goal = makeGoal({ repo: "  owner/repo  " });
    expect(extractValidRepoFromGoal(goal)).toBe("owner/repo");
  });

  it("returns null when all fields are null", () => {
    const goal = makeGoal({});
    expect(extractValidRepoFromGoal(goal)).toBeNull();
  });

  it("returns null when all fields are undefined", () => {
    const goal = { id: "g", unit: "prs", repo: undefined, repository: undefined, repo_name: undefined };
    // @ts-ignore — intentionally passing undefined
    expect(extractValidRepoFromGoal(goal)).toBeNull();
  });

  it("returns null when repo field is empty string", () => {
    const goal = makeGoal({ repo: "" });
    expect(extractValidRepoFromGoal(goal)).toBeNull();
  });

  it("returns null when repo field is whitespace-only", () => {
    const goal = makeGoal({ repo: "   " });
    expect(extractValidRepoFromGoal(goal)).toBeNull();
  });

  it("returns null for missing slash", () => {
    const goal = makeGoal({ repo: "justarepo" });
    expect(extractValidRepoFromGoal(goal)).toBeNull();
  });

  it("returns null for empty owner", () => {
    const goal = makeGoal({ repo: "/react" });
    expect(extractValidRepoFromGoal(goal)).toBeNull();
  });

  it("returns null for empty repo name", () => {
    const goal = makeGoal({ repo: "facebook/" });
    expect(extractValidRepoFromGoal(goal)).toBeNull();
  });

  it("returns null when owner starts with a hyphen", () => {
    const goal = makeGoal({ repo: "-owner/repo" });
    expect(extractValidRepoFromGoal(goal)).toBeNull();
  });

  it("returns null when owner ends with a hyphen", () => {
    const goal = makeGoal({ repo: "owner-/repo" });
    expect(extractValidRepoFromGoal(goal)).toBeNull();
  });

  it("returns null for dot-only repo name (. and ..)", () => {
    expect(extractValidRepoFromGoal(makeGoal({ repo: "owner/." }))).toBeNull();
    expect(extractValidRepoFromGoal(makeGoal({ repo: "owner/.." }))).toBeNull();
  });

  it("returns null for extra slashes", () => {
    const goal = makeGoal({ repo: "owner/repo/extra" });
    expect(extractValidRepoFromGoal(goal)).toBeNull();
  });

  it("accepts repo names with dots, hyphens, underscores", () => {
    const goal = makeGoal({ repo: "owner/my_repo-name.v2" });
    expect(extractValidRepoFromGoal(goal)).toBe("owner/my_repo-name.v2");
  });

  it("accepts single-character owner and repo", () => {
    const goal = makeGoal({ repo: "a/b" });
    expect(extractValidRepoFromGoal(goal)).toBe("a/b");
  });
});
