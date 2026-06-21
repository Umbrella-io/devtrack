import { describe, it, expect } from "vitest";
import { parseRepoParam, REPO_IDENTIFIER_RE } from "@/lib/repo-analytics-utils";

describe("repo-analytics-utils unit evaluation matrix", () => {
  describe("REPO_IDENTIFIER_RE regex signature checks", () => {
    it("should match standard compliant owner/repo combinations", () => {
      expect(REPO_IDENTIFIER_RE.test("Umbrella-io/devtrack")).toBe(true);
      expect(REPO_IDENTIFIER_RE.test("stewartsson/repo-1")).toBe(true);
    });

    it("should reject structurally invalid layouts immediately", () => {
      expect(REPO_IDENTIFIER_RE.test("no-slash-format")).toBe(false);
      expect(REPO_IDENTIFIER_RE.test("owner/repo/extra-slash")).toBe(false);
    });
  });

  describe("parseRepoParam function execution validation", () => {
    it("should successfully parse valid owner/repo strings and verify structural shape output", () => {
      const result = parseRepoParam("Umbrella-io/devtrack");
      expect(result).toEqual({ owner: "Umbrella-io", repo: "devtrack" });
    });

    it("should securely handle and trim leading and trailing whitespace characters", () => {
      const result = parseRepoParam("  Umbrella-io/devtrack   ");
      expect(result).toEqual({ owner: "Umbrella-io", repo: "devtrack" });
    });

    it("should return null for malformed strings missing a canonical separation slash", () => {
      expect(parseRepoParam("invalidinputformat")).toBeNull();
    });

    it("should return null if the owner block parameter resolves empty", () => {
      expect(parseRepoParam("/devtrack")).toBeNull();
    });

    it("should return null if the repository block parameter resolves empty", () => {
      expect(parseRepoParam("Umbrella-io/")).toBeNull();
    });

    it("should return null if the owner token starts or terminates with forbidden hyphens", () => {
      expect(parseRepoParam("-Umbrella-io/devtrack")).toBeNull();
      expect(parseRepoParam("Umbrella-io-/devtrack")).toBeNull();
    });

    it("should return null if the repository token starts or terminates with forbidden hyphens", () => {
      expect(parseRepoParam("Umbrella-io/-devtrack")).toBeNull();
      expect(parseRepoParam("Umbrella-io/devtrack-")).toBeNull();
    });

    it("should return null for forbidden dot-only repository name layout states", () => {
      expect(parseRepoParam("Umbrella-io/.")).toBeNull();
      expect(parseRepoParam("Umbrella-io/..")).toBeNull();
    });

    it("should return null if the path argument carries extra separation slashes", () => {
      expect(parseRepoParam("Umbrella-io/devtrack/extra")).toBeNull();
    });

    describe("Extreme character boundary threshold constraints", () => {
      it("should accept minimum allowable single character constraints for entities", () => {
        expect(parseRepoParam("a/b")).toEqual({ owner: "a", repo: "b" });
      });

      it("should accept valid maximum boundary thresholds exactly on the line limit metrics", () => {
        const maxOwner = "a".repeat(39);
        const maxRepo = "b".repeat(100);
        expect(parseRepoParam(`${maxOwner}/${maxRepo}`)).toEqual({ owner: maxOwner, repo: maxRepo });
      });

      it("should return null if the owner structural block breaks past the 39 character limit", () => {
        const customOwner = "a".repeat(40);
        expect(parseRepoParam(`${customOwner}/devtrack`)).toBeNull();
      });

      it("should return null if the repository structural block breaks past the 100 character limit", () => {
        const customRepo = "b".repeat(101);
        expect(parseRepoParam(`Umbrella-io/${customRepo}`)).toBeNull();
      });
    });
  });
});

