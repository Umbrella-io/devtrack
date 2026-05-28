import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSelect = vi.fn().mockReturnThis();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockSupabaseChain = {
  select: mockSelect,
  eq: mockEq,
  single: mockSingle,
};
const mockSupabaseAdmin = { from: vi.fn(() => mockSupabaseChain) };

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: mockSupabaseAdmin }));
vi.mock('@/lib/crypto', () => ({ decryptToken: vi.fn() }));

describe('getLinkedAccounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnThis();
    mockSupabaseAdmin.from = vi.fn(() => mockSupabaseChain);
  });

  it('returns empty array when no linked accounts exist', async () => {
    mockEq.mockResolvedValue({ data: [], error: null });
    const { getLinkedAccounts } = await import('../src/lib/github-accounts');
    const result = await getLinkedAccounts('user1');
    expect(result).toEqual([]);
  });

  it('returns decrypted accounts from database rows', async () => {
    const { decryptToken } = await import('@/lib/crypto');
    (decryptToken as ReturnType<typeof vi.fn>).mockReturnValue('decrypted-token');
    mockEq.mockResolvedValue({
      data: [
        { github_id: '123', github_login: 'user1', access_token_encrypted: 'e1', access_token_iv: 'i1' },
        { github_id: '456', github_login: 'user2', access_token_encrypted: 'e2', access_token_iv: 'i2' },
      ],
      error: null,
    });
    const { getLinkedAccounts } = await import('../src/lib/github-accounts');
    const result = await getLinkedAccounts('user1');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ githubId: '123', githubLogin: 'user1', token: 'decrypted-token' });
    expect(result[1]).toEqual({ githubId: '456', githubLogin: 'user2', token: 'decrypted-token' });
  });

  it('filters out accounts where decryption returns null', async () => {
    const { decryptToken } = await import('@/lib/crypto');
    const returns = ['valid-token', null, 'another-token'];
    (decryptToken as ReturnType<typeof vi.fn>).mockImplementation(() => returns.shift());
    mockEq.mockResolvedValue({
      data: [
        { github_id: '1', github_login: 'a', access_token_encrypted: 'e1', access_token_iv: 'i1' },
        { github_id: '2', github_login: 'b', access_token_encrypted: 'e2', access_token_iv: 'i2' },
        { github_id: '3', github_login: 'c', access_token_encrypted: 'e3', access_token_iv: 'i3' },
      ],
      error: null,
    });
    const { getLinkedAccounts } = await import('../src/lib/github-accounts');
    const result = await getLinkedAccounts('user1');
    expect(result).toHaveLength(2);
  });

  it('throws error when database query fails', async () => {
    mockEq.mockResolvedValue({ data: null, error: new Error('DB down') });
    const { getLinkedAccounts } = await import('../src/lib/github-accounts');
    await expect(getLinkedAccounts('user1')).rejects.toThrow('Failed to fetch linked accounts');
  });
});

describe('getAllAccounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnThis();
    mockSupabaseAdmin.from = vi.fn(() => mockSupabaseChain);
  });

  it('returns primary account when no linked accounts', async () => {
    mockEq.mockResolvedValue({ data: [], error: null });
    const { getAllAccounts } = await import('../src/lib/github-accounts');
    const result = await getAllAccounts(
      { token: 'primary-token', githubId: '1', githubLogin: 'main' },
      'user1'
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ token: 'primary-token', githubId: '1', githubLogin: 'main' });
  });

  it('deduplicates linked account that matches primary githubId', async () => {
    const { decryptToken } = await import('@/lib/crypto');
    (decryptToken as ReturnType<typeof vi.fn>).mockReturnValue('linked-token');
    mockEq.mockResolvedValue({
      data: [
        { github_id: '1', github_login: 'main', access_token_encrypted: 'e1', access_token_iv: 'i1' },
        { github_id: '2', github_login: 'other', access_token_encrypted: 'e2', access_token_iv: 'i2' },
      ],
      error: null,
    });
    const { getAllAccounts } = await import('../src/lib/github-accounts');
    const result = await getAllAccounts(
      { token: 'primary-token', githubId: '1', githubLogin: 'main' },
      'user1'
    );
    expect(result).toHaveLength(2);
    expect(result[0].githubId).toBe('1');
    expect(result[1].githubId).toBe('2');
  });
});

describe('getAccountToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnThis();
    mockSupabaseAdmin.from = vi.fn(() => mockSupabaseChain);
  });

  it('returns decrypted token when account exists', async () => {
    const { decryptToken } = await import('@/lib/crypto');
    (decryptToken as ReturnType<typeof vi.fn>).mockReturnValue('account-token');
    mockEq.mockReturnThis();
    mockSingle.mockResolvedValue({
      data: { access_token_encrypted: 'enc', access_token_iv: 'iv' },
      error: null,
    });
    const { getAccountToken } = await import('../src/lib/github-accounts');
    const result = await getAccountToken('user1', '456');
    expect(result).toBe('account-token');
  });

  it('returns null when account not found', async () => {
    mockEq.mockReturnThis();
    mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } });
    const { getAccountToken } = await import('../src/lib/github-accounts');
    const result = await getAccountToken('user1', 'nonexistent');
    expect(result).toBeNull();
  });

  it('returns null when decryption fails', async () => {
    const { decryptToken } = await import('@/lib/crypto');
    (decryptToken as ReturnType<typeof vi.fn>).mockImplementation(() => { throw new Error('decrypt fail'); });
    mockEq.mockReturnThis();
    mockSingle.mockResolvedValue({
      data: { access_token_encrypted: 'bad', access_token_iv: 'bad' },
      error: null,
    });
    const { getAccountToken } = await import('../src/lib/github-accounts');
    const result = await getAccountToken('user1', '456');
    expect(result).toBeNull();
  });
});
