import dns from "dns";
import { promisify } from "util";

const resolve = promisify(dns.resolve);

const PRIVATE_RANGES = [
  { start: 0x0a000000, end: 0x0affffff }, // 10.0.0.0/8
  { start: 0xac100000, end: 0xac1fffff }, // 172.16.0.0/12
  { start: 0xc0a80000, end: 0xc0a8ffff }, // 192.168.0.0/16
  { start: 0x7f000000, end: 0x7fffffff }, // 127.0.0.0/8 (loopback)
  { start: 0xa9fe0000, end: 0xa9feffff }, // 169.254.0.0/16 (link-local)
  { start: 0x64400000, end: 0x647fffff }, // 100.64.0.0/10 (shared address space)
  { start: 0x00000000, end: 0x00ffffff }, // 0.0.0.0/8
];

function ipToNumber(ip: string): number {
  const parts = ip.split(".").map(Number);
  return (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
}

function isPrivateIPv4(ip: string): boolean {
  const num = ipToNumber(ip);
  return PRIVATE_RANGES.some(({ start, end }) => num >= start && num <= end);
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();

  // Loopback
  if (lower === "::1") return true;

  // Unspecified address
  if (lower === "::") return true;

  // Link-local: fe80::/10
  if (lower.startsWith("fe80:")) return true;

  // Unique local: fc00::/7 (covers fc00:: and fd00::)
  if (lower.startsWith("fc00:") || lower.startsWith("fd00:")) return true;

  // IPv6-mapped IPv4: ::ffff:x.x.x.x  (e.g. ::ffff:10.0.0.1)
  const mappedMatch = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mappedMatch) {
    return isPrivateIPv4(mappedMatch[1]);
  }

  // IPv6-mapped IPv4 in hex form: ::ffff:0a00:0001 → 10.0.0.1
  const mappedHexMatch = lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (mappedHexMatch) {
    const hi = parseInt(mappedHexMatch[1], 16);
    const lo = parseInt(mappedHexMatch[2], 16);
    const ipv4 = `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
    return isPrivateIPv4(ipv4);
  }

  return false;
}

function isPrivateIP(ip: string): boolean {
  // IPv6 address (contains colon)
  if (ip.includes(":")) {
    return isPrivateIPv6(ip);
  }
  return isPrivateIPv4(ip);
}

export async function isSafeUrl(url: string): Promise<boolean> {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }

    const hostname = parsed.hostname;

    // Block bare localhost/any-interface literals before DNS
    if (
      hostname === "localhost" ||
      hostname === "0.0.0.0" ||
      hostname === "::1" ||
      hostname === "::"
    ) {
      return false;
    }

    // Resolve both A (IPv4) and AAAA (IPv6) records
    const [aRecords, aaaaRecords] = await Promise.all([
      resolve(hostname, "A").catch(() => [] as string[]),
      resolve(hostname, "AAAA").catch(() => [] as string[]),
    ]);

    // At least one record family must resolve — reject if neither does
    if (aRecords.length === 0 && aaaaRecords.length === 0) {
      return false;
    }

    for (const addr of [...aRecords, ...aaaaRecords]) {
      if (isPrivateIP(addr)) {
        return false;
      }
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