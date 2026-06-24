import { describe, it, expect } from 'vitest';
import { getClientIp } from '../src/lib/rate-limit';

describe('getClientIp', () => {
  it('should return the cf-connecting-ip header value', () => {
    // Create a mock object that mimics the Web Request headers structure
    const mockRequest = {
      headers: {
        get: (headerName: string) => {
          if (headerName === 'cf-connecting-ip') return '1.2.3.4';
          return null;
        }
      }
    };

    // Cast it as any to bypass TS checks if the function expects a full Request object
    expect(getClientIp(mockRequest as any)).toBe('1.2.3.4');
  });
});