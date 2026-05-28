import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock crypto so decryptToken returns a predictable value based on the encrypted input
const { decryptTokenMock } = vi.hoisted(() => ({
  decryptTokenMock: vi.fn((encrypted: string, _iv: string) => {
    if (encrypted === 'FAIL') return null;
    return encrypted; // identity: decrypted === encrypted (for easy test setup)
  }),
}));

vi.mock('@/lib/crypto', () => ({
  decryptToken: decryptTokenMock,
}));

// The supabase mock is set up per-test via its return value to simulate different
// linked-account scenarios for getAllTokens.
const { selectMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnValue({
      select: selectMock,
    }),
  },
}));

import { getAllTokens } from '../src/lib/github-accounts';

// Helper: configure the supabase chain mock to return a given list of rows
function mockLinkedRows(
  rows: Array<{ access_token_encrypted: string; access_token_iv: string }>
) {
  selectMock.mockReturnValue({
    eq: vi.fn().mockResolvedValue({ data: rows, error: null }),
  });
}

describe('getAllTokens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    decryptTokenMock.mockImplementation((encrypted: string, _iv: string) => {
      if (encrypted === 'FAIL') return null;
      return encrypted;
    });
  });

  it('returns only the primary token when no linked accounts exist', async () => {
    mockLinkedRows([]);
    const result = await getAllTokens('primary-token', 'user-123');
    expect(result).toEqual(['primary-token']);
  });

  it('returns primary token followed by distinct linked tokens', async () => {
    mockLinkedRows([
      { access_token_encrypted: 'linked-token-a', access_token_iv: 'iv-a' },
      { access_token_encrypted: 'linked-token-b', access_token_iv: 'iv-b' },
    ]);
    const result = await getAllTokens('primary-token', 'user-123');
    expect(result).toEqual(['primary-token', 'linked-token-a', 'linked-token-b']);
  });

  it('deduplicates the primary token when it appears in linked accounts', async () => {
    mockLinkedRows([
      { access_token_encrypted: 'primary-token', access_token_iv: 'iv-primary' },
      { access_token_encrypted: 'linked-token-b', access_token_iv: 'iv-b' },
    ]);
    const result = await getAllTokens('primary-token', 'user-123');
    expect(result.filter((t) => t === 'primary-token')).toHaveLength(1);
    expect(result[0]).toBe('primary-token');
    expect(result).toContain('linked-token-b');
    expect(result).toHaveLength(2);
  });

  it('deduplicates all occurrences of the primary token from linked accounts', async () => {
    mockLinkedRows([
      { access_token_encrypted: 'primary-token', access_token_iv: 'iv-1' },
      { access_token_encrypted: 'primary-token', access_token_iv: 'iv-2' },
      { access_token_encrypted: 'other-token', access_token_iv: 'iv-3' },
    ]);
    const result = await getAllTokens('primary-token', 'user-123');
    expect(result.filter((t) => t === 'primary-token')).toHaveLength(1);
    expect(result).toEqual(['primary-token', 'other-token']);
  });

  it('starts the result array with the primary token', async () => {
    mockLinkedRows([
      { access_token_encrypted: 'linked-token-x', access_token_iv: 'iv-x' },
    ]);
    const result = await getAllTokens('primary-token', 'user-123');
    expect(result[0]).toBe('primary-token');
  });

  it('skips linked rows whose token fails decryption', async () => {
    mockLinkedRows([
      { access_token_encrypted: 'FAIL', access_token_iv: 'iv-fail' },
      { access_token_encrypted: 'valid-linked', access_token_iv: 'iv-valid' },
    ]);
    const result = await getAllTokens('primary-token', 'user-123');
    expect(result).not.toContain(null);
    expect(result).toEqual(['primary-token', 'valid-linked']);
  });

  it('returns only primary token when all linked tokens fail decryption', async () => {
    mockLinkedRows([
      { access_token_encrypted: 'FAIL', access_token_iv: 'iv-fail' },
    ]);
    const result = await getAllTokens('primary-token', 'user-123');
    expect(result).toEqual(['primary-token']);
  });
});
