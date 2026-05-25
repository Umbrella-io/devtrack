import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockEq = vi.fn();
const mockSupabaseChain = { select: vi.fn().mockReturnThis(), eq: mockEq };
const mockSupabaseAdmin = { from: vi.fn(() => mockSupabaseChain) };

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: mockSupabaseAdmin }));
vi.mock('@/lib/crypto', () => ({ decryptToken: vi.fn() }));

describe('getAllTokens deduplication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEq.mockResolvedValue({ data: [], error: null });
    mockSupabaseChain.select = vi.fn().mockReturnThis();
    mockSupabaseAdmin.from = vi.fn(() => mockSupabaseChain);
  });

  it('returns primary token alone when no linked tokens', async () => {
    mockEq.mockResolvedValue({ data: [], error: null });
    const { getAllTokens } = await import('../src/lib/github-accounts');
    const result = await getAllTokens('primary-token', 'user1');
    expect(result).toEqual(['primary-token']);
  });

  it('deduplicates primary token when it appears in linked tokens', async () => {
    const { decryptToken } = await import('@/lib/crypto');
    (decryptToken as ReturnType<typeof vi.fn>).mockReturnValue('primary-token');
    mockEq.mockResolvedValue({
      data: [
        { access_token_encrypted: 'e1', access_token_iv: 'i1' },
      ],
      error: null,
    });
    const { getAllTokens } = await import('../src/lib/github-accounts');
    const result = await getAllTokens('primary-token', 'user1');
    expect(result).toEqual(['primary-token']);
  });

  it('includes unique linked tokens after primary', async () => {
    const { decryptToken } = await import('@/lib/crypto');
    const returns = ['token-a', 'token-b'];
    (decryptToken as ReturnType<typeof vi.fn>).mockImplementation(() => returns.shift());
    mockEq.mockResolvedValue({
      data: [
        { access_token_encrypted: 'e1', access_token_iv: 'i1' },
        { access_token_encrypted: 'e2', access_token_iv: 'i2' },
      ],
      error: null,
    });
    const { getAllTokens } = await import('../src/lib/github-accounts');
    const result = await getAllTokens('primary-token', 'user1');
    expect(result).toEqual(['primary-token', 'token-a', 'token-b']);
  });

  it('handles multiple linked tokens with no overlap with primary', async () => {
    const { decryptToken } = await import('@/lib/crypto');
    const returns = ['tok-x', 'tok-y', 'tok-z'];
    (decryptToken as ReturnType<typeof vi.fn>).mockImplementation(() => returns.shift());
    mockEq.mockResolvedValue({
      data: [
        { access_token_encrypted: 'e1', access_token_iv: 'i1' },
        { access_token_encrypted: 'e2', access_token_iv: 'i2' },
        { access_token_encrypted: 'e3', access_token_iv: 'i3' },
      ],
      error: null,
    });
    const { getAllTokens } = await import('../src/lib/github-accounts');
    const result = await getAllTokens('primary-token', 'user1');
    expect(result).toEqual(['primary-token', 'tok-x', 'tok-y', 'tok-z']);
  });
});
