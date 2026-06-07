import { validateUrlBasic, isSafeUrl } from "../src/lib/ssrf-protection";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import dns from "dns";

vi.mock("dns", () => ({
  default: {
    resolve: vi.fn(),
  },
}));

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

  describe("isSafeUrl", () => {
    const mockResolve = dns.resolve as any;

    beforeEach(() => {
      mockResolve.mockReset();
    });

    it("should return false for invalid protocol", async () => {
      expect(await isSafeUrl("ftp://example.com")).toBe(false);
    });

    it("should return false for localhost and 0.0.0.0 bypasses", async () => {
      expect(await isSafeUrl("http://localhost")).toBe(false);
      expect(await isSafeUrl("http://0.0.0.0")).toBe(false);
      expect(await isSafeUrl("http://[::1]")).toBe(false);
    });

    it("should return true for public IPs", async () => {
      mockResolve.mockImplementation((hostname: string, rrtype: string, cb: Function) => {
        if (rrtype === "A") cb(null, ["8.8.8.8"]);
        else cb(new Error("ENOTFOUND"));
      });
      expect(await isSafeUrl("http://example.com")).toBe(true);
    });

    it("should return false for private IPv4", async () => {
      mockResolve.mockImplementation((hostname: string, rrtype: string, cb: Function) => {
        if (rrtype === "A") cb(null, ["10.0.0.1"]);
        else cb(new Error("ENOTFOUND"));
      });
      expect(await isSafeUrl("http://internal.com")).toBe(false);
    });

    it("should return false for IPv6-mapped IPv4 private address", async () => {
      mockResolve.mockImplementation((hostname: string, rrtype: string, cb: Function) => {
        if (rrtype === "AAAA") cb(null, ["::ffff:192.168.1.1"]);
        else cb(new Error("ENOTFOUND"));
      });
      expect(await isSafeUrl("http://internal.com")).toBe(false);
    });

    it("should return false for IPv6 loopback and link-local", async () => {
      mockResolve.mockImplementation((hostname: string, rrtype: string, cb: Function) => {
        if (rrtype === "AAAA") cb(null, ["fe80::1"]);
        else cb(new Error("ENOTFOUND"));
      });
      expect(await isSafeUrl("http://internal.com")).toBe(false);
    });

    it("should return true for public IPv6", async () => {
      mockResolve.mockImplementation((hostname: string, rrtype: string, cb: Function) => {
        if (rrtype === "AAAA") cb(null, ["2001:4860:4860::8888"]);
        else cb(new Error("ENOTFOUND"));
      });
      expect(await isSafeUrl("http://example.com")).toBe(true);
    });
  });
});
