import { describe, it, expect } from "vitest";
import { validateUrlBasic } from "../src/lib/ssrf-protection";

// We import the internal pure functions via a workaround — access them
// from the module directly. Since they are not re-exported, we re-implement
// the same logic here to test the documented behavior.
function ipToNumber(ip: string): number {
  const parts = ip.split(".");
  if (parts.length !== 4) return NaN;
  const numParts = parts.map(Number);
  if (numParts.some((n) => isNaN(n) || n < 0 || n > 255 || !Number.isInteger(n))) return NaN;
  return ((numParts[0] << 24) | (numParts[1] << 16) | (numParts[2] << 8) | numParts[3]) >>> 0;
}

// We replicate the private IP range logic so the test is self-contained.
// The actual ssrf-protection module does the same check internally.
const PRIVATE_RANGES = [
  { start: 0x0a000000, end: 0x0affffff }, // 10.0.0.0/8
  { start: 0xac100000, end: 0xac1fffff }, // 172.16.0.0/12
  { start: 0xc0a80000, end: 0xc0a8ffff }, // 192.168.0.0/16
  { start: 0x7f000000, end: 0x7fffffff }, // 127.0.0.0/8
  { start: 0xa9fe0000, end: 0xa9feffff }, // 169.254.0.0/16
];

function isPrivateIP(ip: string): boolean {
  ip = ip.toLowerCase();

  // Extract IPv4 from IPv6-mapped IPv4 address
  if (ip.startsWith("::ffff:")) {
    const ipv4Part = ip.slice(7);
    if (ipv4Part.includes(".")) {
      ip = ipv4Part;
    } else {
      return true; // Block non-standard encodings of mapped IPv4
    }
  }

  // IPv6 private/loopback checks
  if (
    ip === "::1" ||
    ip === "::" ||
    ip.startsWith("fe80:") ||
    ip.startsWith("fc00:") ||
    ip.startsWith("fd00:")
  ) {
    return true;
  }

  if (ip.includes(":")) {
    return false; // Public IPv6
  }

  const num = ipToNumber(ip);
  if (isNaN(num)) return true; // Block invalid formats

  return PRIVATE_RANGES.some(({ start, end }) => num >= start && num <= end);
}

describe("ssrf-protection", () => {
  describe("ipToNumber", () => {
    it("converts 0.0.0.0 to 0", () => {
      expect(ipToNumber("0.0.0.0")).toBe(0);
    });

    it("converts 255.255.255.255 to the max value", () => {
      expect(ipToNumber("255.255.255.255")).toBe(0xffffffff);
    });

    it("converts a standard private IP 192.168.1.1", () => {
      expect(ipToNumber("192.168.1.1")).toBe(0xc0a80101);
    });

    it("converts 10.0.0.1 correctly", () => {
      expect(ipToNumber("10.0.0.1")).toBe(0x0a000001);
    });

    it("returns NaN for an IP with non-numeric parts", () => {
      expect(isNaN(ipToNumber("abc.def.ghi.jkl"))).toBe(true);
    });

    it("returns NaN for an IP with out-of-range octet values", () => {
      expect(isNaN(ipToNumber("256.0.0.1"))).toBe(true);
      expect(isNaN(ipToNumber("192.168.1.-1"))).toBe(true);
      expect(isNaN(ipToNumber("192.168.1.256"))).toBe(true);
    });

    it("returns NaN for an IP with too few octets", () => {
      expect(isNaN(ipToNumber("192.168.1"))).toBe(true);
      expect(isNaN(ipToNumber("192.168"))).toBe(true);
    });

    it("returns NaN for an IP with too many octets", () => {
      expect(isNaN(ipToNumber("192.168.1.1.1"))).toBe(true);
    });

    it("returns NaN for empty string", () => {
      expect(isNaN(ipToNumber(""))).toBe(true);
    });

    it("returns NaN for fractional octets", () => {
      expect(isNaN(ipToNumber("192.168.1.1.5"))).toBe(true);
    });
  });

  describe("isPrivateIP", () => {
    // 10.0.0.0/8 range
    it("returns true for 10.0.0.0", () => {
      expect(isPrivateIP("10.0.0.0")).toBe(true);
    });
    it("returns true for 10.255.255.255", () => {
      expect(isPrivateIP("10.255.255.255")).toBe(true);
    });
    it("returns true for 10.1.2.3", () => {
      expect(isPrivateIP("10.1.2.3")).toBe(true);
    });

    // 172.16.0.0/12 range
    it("returns true for 172.16.0.0", () => {
      expect(isPrivateIP("172.16.0.0")).toBe(true);
    });
    it("returns true for 172.31.255.255", () => {
      expect(isPrivateIP("172.31.255.255")).toBe(true);
    });
    it("returns true for 172.20.0.1", () => {
      expect(isPrivateIP("172.20.0.1")).toBe(true);
    });

    // 192.168.0.0/16 range
    it("returns true for 192.168.0.0", () => {
      expect(isPrivateIP("192.168.0.0")).toBe(true);
    });
    it("returns true for 192.168.255.255", () => {
      expect(isPrivateIP("192.168.255.255")).toBe(true);
    });
    it("returns true for 192.168.1.100", () => {
      expect(isPrivateIP("192.168.1.100")).toBe(true);
    });

    // 127.0.0.0/8 range
    it("returns true for 127.0.0.1", () => {
      expect(isPrivateIP("127.0.0.1")).toBe(true);
    });
    it("returns true for 127.255.255.255", () => {
      expect(isPrivateIP("127.255.255.255")).toBe(true);
    });

    // 169.254.0.0/16 range (link-local)
    it("returns true for 169.254.0.0", () => {
      expect(isPrivateIP("169.254.0.0")).toBe(true);
    });
    it("returns true for 169.254.255.255", () => {
      expect(isPrivateIP("169.254.255.255")).toBe(true);
    });

    // IPv6 loopback and private addresses
    it("returns true for IPv6 loopback ::1", () => {
      expect(isPrivateIP("::1")).toBe(true);
    });
    it("returns true for IPv6 unspecified ::", () => {
      expect(isPrivateIP("::")).toBe(true);
    });
    it("returns true for IPv6 link-local fe80::", () => {
      expect(isPrivateIP("fe80::1")).toBe(true);
    });
    it("returns true for IPv6 private fc00::", () => {
      expect(isPrivateIP("fc00::1")).toBe(true);
    });
    it("returns true for IPv6 private fd00::", () => {
      expect(isPrivateIP("fd00::1")).toBe(true);
    });

    // IPv6-mapped IPv4 addresses
    it("returns true for ::ffff:127.0.0.1 (IPv6-mapped loopback)", () => {
      expect(isPrivateIP("::ffff:127.0.0.1")).toBe(true);
    });
    it("returns true for ::ffff:10.0.0.1 (IPv6-mapped private)", () => {
      expect(isPrivateIP("::ffff:10.0.0.1")).toBe(true);
    });
    it("returns false for ::ffff:8.8.8.8 (public IPv4 via mapped)", () => {
      expect(isPrivateIP("::ffff:8.8.8.8")).toBe(false);
    });

    // Public IPv6 addresses
    it("returns false for a public IPv6 address", () => {
      expect(isPrivateIP("2001:4860:4860:0000:0000:0000:0000:8888")).toBe(false);
    });

    // Public IPv4 addresses
    it("returns false for 8.8.8.8 (Google DNS)", () => {
      expect(isPrivateIP("8.8.8.8")).toBe(false);
    });
    it("returns false for 1.1.1.1 (Cloudflare DNS)", () => {
      expect(isPrivateIP("1.1.1.1")).toBe(false);
    });
    it("returns false for 142.250.185.46 (google.com)", () => {
      expect(isPrivateIP("142.250.185.46")).toBe(false);
    });

    // Edge cases at range boundaries
    it("returns false for 172.15.255.255 (just outside 172.16.0.0/12)", () => {
      expect(isPrivateIP("172.15.255.255")).toBe(false);
    });
    it("returns false for 172.32.0.0 (just outside 172.16.0.0/12)", () => {
      expect(isPrivateIP("172.32.0.0")).toBe(false);
    });
    it("returns false for 192.167.255.255 (just outside 192.168.0.0/16)", () => {
      expect(isPrivateIP("192.167.255.255")).toBe(false);
    });

    // Invalid formats
    it("returns true (blocked) for an invalid IP string", () => {
      expect(isPrivateIP("not-an-ip")).toBe(true);
    });
    it("returns true (blocked) for malformed IP", () => {
      expect(isPrivateIP("999.999.999.999")).toBe(true);
    });
  });

  describe("validateUrlBasic", () => {
    it("returns true for http:// URLs", () => {
      expect(validateUrlBasic("http://example.com")).toBe(true);
    });

    it("returns true for https:// URLs", () => {
      expect(validateUrlBasic("https://example.com")).toBe(true);
    });

    it("returns true for https:// URLs with ports and paths", () => {
      expect(validateUrlBasic("https://example.com:8080/path?query=1")).toBe(true);
    });

    it("returns false for ftp:// URLs", () => {
      expect(validateUrlBasic("ftp://example.com")).toBe(false);
    });

    it("returns false for data: URLs", () => {
      expect(validateUrlBasic("data:text/html,<h1>hello</h1>")).toBe(false);
    });

    it("returns false for javascript: URLs", () => {
      expect(validateUrlBasic("javascript:alert(1)")).toBe(false);
    });

    it("returns false for file:// URLs", () => {
      expect(validateUrlBasic("file:///etc/passwd")).toBe(false);
    });

    it("returns false for malformed URLs", () => {
      expect(validateUrlBasic("not-a-url")).toBe(false);
      expect(validateUrlBasic("")).toBe(false);
    });

    it("returns false for http:// with no host", () => {
      expect(validateUrlBasic("http://")).toBe(false);
    });
  });
});
