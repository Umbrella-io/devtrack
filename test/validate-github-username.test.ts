import { describe, it, expect } from "vitest";
import { isValidGitHubUsername, normalizeGitHubUsername } from "../src/lib/validate-github-username";

describe("isValidGitHubUsername", () => {
  it("returns true for valid simple username", () => {
    expect(isValidGitHubUsername("johndoe")).toBe(true);
  });

  it("returns true for username with numbers", () => {
    expect(isValidGitHubUsername("user123")).toBe(true);
  });

  it("returns true for username with single hyphen", () => {
    expect(isValidGitHubUsername("john-doe")).toBe(true);
  });

  it("returns true for username starting with digit", () => {
    expect(isValidGitHubUsername("123john")).toBe(true);
  });

  it("returns true for username ending with digit", () => {
    expect(isValidGitHubUsername("john123")).toBe(true);
  });

  it("returns true for username with multiple hyphens", () => {
    expect(isValidGitHubUsername("john-doe-smith")).toBe(true);
  });

  it("returns true for username at min length (1 char)", () => {
    expect(isValidGitHubUsername("a")).toBe(true);
  });

  it("returns true for username at max length (39 chars)", () => {
    expect(isValidGitHubUsername("a".repeat(39))).toBe(true);
  });

  it("returns false for username starting with hyphen", () => {
    expect(isValidGitHubUsername("-johndoe")).toBe(false);
  });

  it("returns false for username ending with hyphen", () => {
    expect(isValidGitHubUsername("johndoe-")).toBe(false);
  });

  it("returns true for username with consecutive hyphens (regex allows it)", () => {
    expect(isValidGitHubUsername("john--doe")).toBe(true);
  });

  it("returns false for username exceeding max length", () => {
    expect(isValidGitHubUsername("a".repeat(40))).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isValidGitHubUsername("")).toBe(false);
  });

  it("returns false for username with uppercase (case insensitive regex)", () => {
    expect(isValidGitHubUsername("JohnDoe")).toBe(true);
  });

  it("returns false for username with special characters", () => {
    expect(isValidGitHubUsername("john_doe")).toBe(false);
  });

  it("returns false for username with spaces", () => {
    expect(isValidGitHubUsername("john doe")).toBe(false);
  });

  it("returns false for username with @ symbol", () => {
    expect(isValidGitHubUsername("@johndoe")).toBe(false);
  });
});

describe("normalizeGitHubUsername", () => {
  it("returns trimmed username for valid input", () => {
    expect(normalizeGitHubUsername("  johndoe  ")).toBe("johndoe");
  });

  it("returns null for null input", () => {
    expect(normalizeGitHubUsername(null)).toBe(null);
  });

  it("returns null for undefined input", () => {
    expect(normalizeGitHubUsername(undefined)).toBe(null);
  });

  it("returns null for empty string", () => {
    expect(normalizeGitHubUsername("")).toBe(null);
  });

  it("returns null for string with only spaces", () => {
    expect(normalizeGitHubUsername("   ")).toBe(null);
  });

  it("returns null for whitespace-only after trim", () => {
    expect(normalizeGitHubUsername("\t\n")).toBe(null);
  });

  it("returns null for invalid username format", () => {
    expect(normalizeGitHubUsername("john doe")).toBe(null);
  });

  it("returns null for username starting with hyphen", () => {
    expect(normalizeGitHubUsername("-johndoe")).toBe(null);
  });

  it("returns null for username ending with hyphen", () => {
    expect(normalizeGitHubUsername("johndoe-")).toBe(null);
  });

  it("returns trimmed valid username", () => {
    expect(normalizeGitHubUsername(" johndoe ")).toBe("johndoe");
  });

  it("handles non-string input gracefully", () => {
    expect(normalizeGitHubUsername(123 as any)).toBe(null);
    expect(normalizeGitHubUsername({} as any)).toBe(null);
    expect(normalizeGitHubUsername([] as any)).toBe(null);
  });
});
