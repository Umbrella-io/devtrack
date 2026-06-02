import { describe, it, expect } from "vitest";
import { cleanUsername, formatRepositoryName } from "../src/lib/string-utils";

describe("string-utils", () => {
  describe("cleanUsername", () => {
    it("should trim whitespace from username", () => {
      expect(cleanUsername("  testuser  ")).toBe("testuser");
    });

    it("should convert username to lowercase", () => {
      expect(cleanUsername("TestUser")).toBe("testuser");
    });

    it("should handle username with both whitespace and uppercase", () => {
      expect(cleanUsername("  TestUser  ")).toBe("testuser");
    });

    it("should return empty string for empty input", () => {
      expect(cleanUsername("")).toBe("");
    });

    it("should handle single character username", () => {
      expect(cleanUsername("A")).toBe("a");
    });

    it("should handle username with special characters", () => {
      expect(cleanUsername("test@#$")).toBe("test@#$");
    });

    it("should handle multiple spaces in username", () => {
      expect(cleanUsername("test  user")).toBe("test  user");
    });
  });

  describe("formatRepositoryName", () => {
    it("should trim whitespace from name", () => {
      expect(formatRepositoryName("  my-repo  ")).toBe("my-repo");
    });

    it("should replace spaces with hyphens", () => {
      expect(formatRepositoryName("my repo")).toBe("my-repo");
    });

    it("should convert name to lowercase", () => {
      expect(formatRepositoryName("MyRepo")).toBe("myrepo");
    });

    it("should replace multiple spaces with single hyphen", () => {
      expect(formatRepositoryName("my  repo")).toBe("my-repo");
    });

    it("should handle name with leading/trailing spaces and multiple whitespace", () => {
      expect(formatRepositoryName("  My   Repo  ")).toBe("my-repo");
    });

    it("should return empty string for empty input", () => {
      expect(formatRepositoryName("")).toBe("");
    });

    it("should handle single word name", () => {
      expect(formatRepositoryName("MyRepo")).toBe("myrepo");
    });

    it("should handle name with mixed whitespace", () => {
      expect(formatRepositoryName("my  repo  name")).toBe("my-repo-name");
    });
  });
});