import dns from "dns";
import { promisify } from "util";

const resolve4 = promisify(dns.resolve4);
const resolve6 = promisify(dns.resolve6);

const PRIVATE_RANGES = [
  { start: 0x0a000000, end: 0x0affffff }, // 10.0.0.0/8
  { start: 0xac100000, end: 0xac1fffff }, // 172.16.0.0/12
  { start: 0xc0a80000, end: 0xc0a8ffff }, // 192.168.0.0/16
  { start: 0x7f000000, end: 0x7fffffff }, // 127.0.0.0/8 (loopback)
  { start: 0xa9fe0000, end: 0xa9feffff }, // 169.254.0.0/16 (link-local)
  { start: 0x00000000, end: 0x00000000 }, // 0.0.0.0
];

/**
 * Returns true when the given IPv4 dotted-decimal string falls within any
 * IANA-reserved private or loopback range.
 */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".");
  if (parts.length !== 4) return false;
  const nums = parts.map(Number);
  if (nums.some((n) => isNaN(n) || n < 0 || n > 255)) return false;

  const num = ((nums[0] << 24) | (nums[1] << 16) | (nums[2] << 8) | nums[3]) >>> 0;
  return PRIVATE_RANGES.some(({ start, end }) => num >= start && num <= end);
}

/**
 * Returns true when the given IPv6 address is a reserved or private address:
 *   - ::1              (loopback)
 *   - ::               (unspecified)
 *   - ::ffff:x.x.x.x  (IPv4-mapped; delegates to isPrivateIPv4)
 *   - fe80::/10        (link-local)
 *   - fc00::/7         (unique-local, covers fc00:: and fd00::)
 *   - 2001:db8::/32    (documentation)
 *   - 100::/64         (discard prefix)
 */
function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();

  if (lower === "::1" || lower === "::") return true;

  // IPv4-mapped IPv6 address: ::ffff:a.b.c.d
  const mappedMatch = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mappedMatch) return isPrivateIPv4(mappedMatch[1]);

  // IPv4-mapped in hex form: ::ffff:0a00:0001 etc. — normalise via prefix check
  if (lower.startsWith("::ffff:")) {
    // Hex form: convert the remaining two 16-bit groups to a.b.c.d
    const hexPart = lower.slice(7).replace(/:/g, "");
    if (/^[0-9a-f]{8}$/i.test(hexPart)) {
      const a = parseInt(hexPart.slice(0, 2), 16);
      const b = parseInt(hexPart.slice(2, 4), 16);
      const c = parseInt(hexPart.slice(4, 6), 16);
      const d = parseInt(hexPart.slice(6, 8), 16);
      return isPrivateIPv4(`${a}.${b}.${c}.${d}`);
    }
  }

  if (lower.startsWith("fe80:")) return true; // link-local fe80::/10
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique-local fc00::/7
  if (lower.startsWith("2001:db8:")) return true; // documentation
  if (lower.startsWith("100::")) return true; // discard

  return false;
}

export async function isSafeUrl(url: string): Promise<boolean> {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }

    const hostname = parsed.hostname;
    if (hostname === "localhost" || hostname === "0.0.0.0") {
      return false;
    }

    // Resolve both A (IPv4) and AAAA (IPv6) records to prevent bypass via
    // IPv6-mapped private addresses (e.g. ::ffff:10.0.0.1) or IPv6-only hosts.
    const [ipv4Addresses, ipv6Addresses] = await Promise.all([
      resolve4(hostname).catch(() => [] as string[]),
      resolve6(hostname).catch(() => [] as string[]),
    ]);

    for (const addr of ipv4Addresses) {
      if (isPrivateIPv4(addr)) return false;
    }

    for (const addr of ipv6Addresses) {
      if (isPrivateIPv6(addr)) return false;
    }

    // Reject if DNS returned no addresses at all (hostname does not exist).
    if (ipv4Addresses.length === 0 && ipv6Addresses.length === 0) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function validateUrlBasic(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
