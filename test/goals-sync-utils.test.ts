import { describe, it, expect } from "vitest";
import { extractValidRepoFromGoal } from "@/lib/goals-sync-utils";
import type { ActivityGoal } from "@/lib/goals-sync-utils";

const makeGoal = (overrides: Partial<ActivityGoal> = {}): ActivityGoal => ({
  id: "goal-1",
  unit: "commits",
  repo: null,
  repository: null,
  repo_name: null,
  ...overrides,
});

describe("extractValidRepoFromGoal", () => {
  describe("returns null when all repo fields are absent", () => {
    it("returns null when all fields are null", () => {
      expect(extractValidRepoFromGoal(makeGoal())).toBeNull();
    });

    it("returns null when all fields are empty strings", () => {
      expect(
        extractValidRepoFromGoal(makeGoal({ repo: "", repository: "", repo_name: "" }))
      ).toBeNull();
    });
  });

  describe("precedence: repo > repository > repo_name", () => {
    it("uses repo when present", () => {
      const goal = makeGoal({ repo: "owner/repo", repository: "other/repo", repo_name: "another/repo" });
      expect(extractValidRepoFromGoal(goal)).toBe("owner/repo");
    });

    it("uses repository when repo is null but repository is present", () => {
      const goal = makeGoal({ repo: null, repository: "owner/repo", repo_name: "other/repo" });
      expect(extractValidRepoFromGoal(goal)).toBe("owner/repo");
    });

    it("uses repo_name when repo and repository are null", () => {
      const goal = makeGoal({ repo: null, repository: null, repo_name: "owner/repo" });
      expect(extractValidRepoFromGoal(goal)).toBe("owner/repo");
    });
  });

  describe("valid owner/repo identifiers", () => {
    it("accepts simple owner/repo", () => {
      expect(extractValidRepoFromGoal(makeGoal({ repo: "owner/repo" }))).toBe("owner/repo");
    });

    it("accepts hyphenated owner and repo", () => {
      expect(extractValidRepoFromGoal(makeGoal({ repo: "my-org/my-repo-name" }))).toBe("my-org/my-repo-name");
    });

    it("accepts owner with hyphen at end of owner part", () => {
      expect(extractValidRepoFromGoal(makeGoal({ repo: "abc-xyz/repo" }))).toBe("abc-xyz/repo");
    });

    it("accepts repo with dots and underscores", () => {
      expect(extractValidRepoFromGoal(makeGoal({ repo: "owner/my_repo.v2" }))).toBe("owner/my_repo.v2");
    });

    it("accepts alphanumeric owner and repo", () => {
      expect(extractValidRepoFromGoal(makeGoal({ repo: "ABC123/XYZ789" }))).toBe("ABC123/XYZ789");
    });
  });

  describe("whitespace trimming", () => {
    it("trims leading and trailing whitespace", () => {
      expect(extractValidRepoFromGoal(makeGoal({ repo: "  owner/repo  " }))).toBe("owner/repo");
    });

    it("trims tab characters", () => {
      expect(extractValidRepoFromGoal(makeGoal({ repo: "\towner/repo\t" }))).toBe("owner/repo");
    });
  });

  describe("invalid identifiers return null", () => {
    it("returns null for empty string", () => {
      expect(extractValidRepoFromGoal(makeGoal({ repo: "" }))).toBeNull();
    });

    it("returns null for repo-only (no slash)", () => {
      expect(extractValidRepoFromGoal(makeGoal({ repo: "owner-repo" }))).toBeNull();
    });

    it("returns null for double slash", () => {
      expect(extractValidRepoFromGoal(makeGoal({ repo: "owner//repo" }))).toBeNull();
    });

    it("returns null for extra path segments", () => {
      expect(extractValidRepoFromGoal(makeGoal({ repo: "owner/repo/path" }))).toBeNull();
    });

    it("returns null for repo name with only dots", () => {
      expect(extractValidRepoFromGoal(makeGoal({ repo: "owner/." }))).toBeNull();
    });

    it("returns null for repo name with double dots", () => {
      expect(extractValidRepoFromGoal(makeGoal({ repo: "owner/.." }))).toBeNull();
    });

    it("returns null when owner starts with hyphen", () => {
      expect(extractValidRepoFromGoal(makeGoal({ repo: "-owner/repo" }))).toBeNull();
    });

    it("returns null when owner ends with hyphen", () => {
      expect(extractValidRepoFromGoal(makeGoal({ repo: "owner-/repo" }))).toBeNull();
    });

    it("returns null for missing owner", () => {
      expect(extractValidRepoFromGoal(makeGoal({ repo: "/repo" }))).toBeNull();
    });

    it("returns null for missing repo", () => {
      expect(extractValidRepoFromGoal(makeGoal({ repo: "owner/" }))).toBeNull();
    });
  });

  describe("non-string types return null", () => {
    it("returns null when repo field is a number", () => {
      const goal = { ...makeGoal(), repo: 123 as unknown as null };
      expect(extractValidRepoFromGoal(goal)).toBeNull();
    });

    it("returns null when repo field is an object", () => {
      const goal = { ...makeGoal(), repo: {} as unknown as null };
      expect(extractValidRepoFromGoal(goal)).toBeNull();
    });
  });
});
