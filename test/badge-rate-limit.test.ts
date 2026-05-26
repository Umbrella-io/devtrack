import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { checkBadgeRateLimit, getBadgeClientIp } from '../src/lib/badge-rate-limit';
import { NextRequest } from 'next/server';

describe('badge-rate-limit', () => {
  describe('checkBadgeRateLimit', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      // Reset state indirectly or just use unique IPs for each test
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('verify 20 requests per minute limit per IP', () => {
      const ip = '1.2.3.4';
      for (let i = 0; i < 20; i++) {
        const result = checkBadgeRateLimit(ip);
        expect(result.allowed).toBe(true);
      }
      const result = checkBadgeRateLimit(ip);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('verify remaining count decrements correctly', () => {
      const ip = '2.3.4.5';
      const r1 = checkBadgeRateLimit(ip);
      expect(r1.remaining).toBe(19);
      const r2 = checkBadgeRateLimit(ip);
      expect(r2.remaining).toBe(18);
    });

    it('verify reset time is calculated correctly', () => {
      const ip = '3.4.5.6';
      vi.setSystemTime(new Date(1000)); // Set time to 1 second past epoch
      const result = checkBadgeRateLimit(ip);
      // Window is 60s, so reset time should be exactly 61s from epoch
      expect(result.reset).toBe(61);
    });

    it('verify bucket pruning works when size exceeds 500', () => {
      // Fill the buckets to exceed the 500 limit
      vi.setSystemTime(new Date(1000));
      for (let i = 0; i < 505; i++) {
        checkBadgeRateLimit(`prune-ip-${i}`);
      }
      
      // Advance time by 61 seconds so the previous 505 IPs are past the cutoff
      vi.advanceTimersByTime(61000);
      
      // Make a new request. This should trigger pruneBuckets and clean up the old ones.
      // Although we can't directly inspect the map size, we can ensure the logic 
      // executes without errors.
      const result = checkBadgeRateLimit('new-ip');
      expect(result.allowed).toBe(true);
    });
  });

  describe('getBadgeClientIp', () => {
    it('verify x-forwarded-for header parsing', () => {
      const req = {
        headers: new Headers({
          'x-forwarded-for': '192.168.1.1, 10.0.0.1'
        })
      } as unknown as NextRequest;
      
      expect(getBadgeClientIp(req)).toBe('192.168.1.1');
    });

    it('verify x-real-ip header handling', () => {
      const req = {
        headers: new Headers({
          'x-real-ip': '10.0.0.2'
        })
      } as unknown as NextRequest;
      
      expect(getBadgeClientIp(req)).toBe('10.0.0.2');
    });

    it('verify fallback to "unknown" when no IP available', () => {
      const req = {
        headers: new Headers()
      } as unknown as NextRequest;
      
      expect(getBadgeClientIp(req)).toBe('unknown');
    });

    it('verify req.ip is used if present', () => {
      const req = {
        ip: '172.16.0.1',
        headers: new Headers()
      } as unknown as NextRequest;
      
      expect(getBadgeClientIp(req)).toBe('172.16.0.1');
    });
  });
});
