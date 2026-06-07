import { validateUrlBasic, isSafeUrl } from "../src/lib/ssrf-protection";
import { describe, it, expect, vi, beforeEach } from "vitest";
import dns from "dns";

vi.mock("dns", () => {
  const resolve4Mock = vi.fn();
  const resolve6Mock = vi.fn();
  return {
    default: {
      resolve4: resolve4Mock,
      resolve6: resolve6Mock,
    },
  };
});

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
    beforeEach(() => {
      vi.mocked(dns.resolve4).mockReset();
      vi.mocked(dns.resolve6).mockReset();
    });

    it("should return false for localhost or 0.0.0.0 directly", async () => {
      expect(await isSafeUrl("http://localhost")).toBe(false);
      expect(await isSafeUrl("http://0.0.0.0")).toBe(false);
    });

    it("should return false if both IPv4 and IPv6 resolutions fail", async () => {
      vi.mocked(dns.resolve4).mockImplementation((host, cb: any) => cb(new Error("DNS error")));
      vi.mocked(dns.resolve6).mockImplementation((host, cb: any) => cb(new Error("DNS error")));
      expect(await isSafeUrl("http://nonexistent.domain")).toBe(false);
    });

    it("should return true for a safe public IP (IPv4 or IPv6)", async () => {
      vi.mocked(dns.resolve4).mockImplementation((host, cb: any) => cb(null, ["93.184.216.34"]));
      vi.mocked(dns.resolve6).mockImplementation((host, cb: any) => cb(null, ["2606:2800:220:1:248:1893:25c8:1946"]));
      expect(await isSafeUrl("https://example.com")).toBe(true);
    });

    it("should return false if resolved IPv4 is in private range", async () => {
      vi.mocked(dns.resolve4).mockImplementation((host, cb: any) => cb(null, ["192.168.1.1"]));
      vi.mocked(dns.resolve6).mockImplementation((host, cb: any) => cb(null, []));
      expect(await isSafeUrl("https://myprivate.com")).toBe(false);
    });

    it("should return false if resolved IPv6 is in unique-local or link-local range", async () => {
      vi.mocked(dns.resolve4).mockImplementation((host, cb: any) => cb(null, []));
      // fc00::1 (unique local)
      vi.mocked(dns.resolve6).mockImplementation((host, cb: any) => cb(null, ["fc00::1"]));
      expect(await isSafeUrl("https://myprivate6.com")).toBe(false);

      vi.mocked(dns.resolve6).mockImplementation((host, cb: any) => cb(null, ["fe80::1"]));
      expect(await isSafeUrl("https://myprivate6.com")).toBe(false);
    });

    it("should return false if resolved IPv6 is an IPv4-mapped private address (standard or hex format)", async () => {
      vi.mocked(dns.resolve4).mockImplementation((host, cb: any) => cb(null, []));
      
      // Standard format: ::ffff:10.0.0.1
      vi.mocked(dns.resolve6).mockImplementation((host, cb: any) => cb(null, ["::ffff:10.0.0.1"]));
      expect(await isSafeUrl("https://mapped-bypass.com")).toBe(false);

      // Hex format: ::ffff:0a00:0001 (10.0.0.1 in hex)
      vi.mocked(dns.resolve6).mockImplementation((host, cb: any) => cb(null, ["::ffff:0a00:0001"]));
      expect(await isSafeUrl("https://mapped-bypass.com")).toBe(false);
    });

    it("should return true if resolved IPv6 is an IPv4-mapped public address", async () => {
      vi.mocked(dns.resolve4).mockImplementation((host, cb: any) => cb(null, []));
      // 8.8.8.8 mapped to IPv6 (::ffff:0808:0808)
      vi.mocked(dns.resolve6).mockImplementation((host, cb: any) => cb(null, ["::ffff:8.8.8.8"]));
      expect(await isSafeUrl("https://mapped-public.com")).toBe(true);
    });
  });
});
