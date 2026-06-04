import { validateUrlBasic } from "../src/lib/ssrf-protection";
import { describe, it, expect } from "vitest";

describe("ssrf-protection", () => {
  describe("validateUrlBasic", () => {
    it("should return true for valid http URL", () => {
      expect(validateUrlBasic("http://example.com")).toBe(true);
    });

    it("should return true for valid https URL", () => {
      expect(validateUrlBasic("https://example.com")).toBe(true);
    });

    it("should return true for https URL with port", () => {
      expect(validateUrlBasic("https://example.com:8080")).toBe(true);
    });

    it("should return true for http URL with path", () => {
      expect(validateUrlBasic("http://example.com/path/to/resource")).toBe(true);
    });

    it("should return false for invalid protocol", () => {
      expect(validateUrlBasic("ftp://example.com")).toBe(false);
      expect(validateUrlBasic("file:///etc/passwd")).toBe(false);
      expect(validateUrlBasic("ssh://example.com")).toBe(false);
    });

    it("should return false for malformed URL", () => {
      expect(validateUrlBasic("not-a-url")).toBe(false);
      expect(validateUrlBasic("")).toBe(false);
      expect(validateUrlBasic("://example.com")).toBe(false);
    });

    it("should return false for URL with no protocol", () => {
      expect(validateUrlBasic("example.com")).toBe(false);
      expect(validateUrlBasic("example.com/path")).toBe(false);
    });

    it("should return false for data URL", () => {
      expect(validateUrlBasic("data:text/html,<script>alert(1)</script>")).toBe(false);
    });

    it("should return false for javascript URL", () => {
      expect(validateUrlBasic("javascript:alert(1)")).toBe(false);
    });

    it("should handle URLs with query parameters", () => {
      expect(validateUrlBasic("https://example.com?foo=bar")).toBe(true);
      expect(validateUrlBasic("https://example.com/path?foo=bar&baz=qux")).toBe(true);
    });

    it("should handle URLs with fragments", () => {
      expect(validateUrlBasic("https://example.com#section")).toBe(true);
      expect(validateUrlBasic("https://example.com/path#section")).toBe(true);
    });
  });
});
