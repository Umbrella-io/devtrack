import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFrom, mockIlike, mockEq, mockSingle } = vi.hoisted(() => {
  const mockSingle = vi.fn();
  const mockEq = vi.fn(() => ({ single: mockSingle }));
  const mockIlike = vi.fn(() => ({ eq: mockEq }));
  const mockSelect = vi.fn(() => ({ ilike: mockIlike }));
  const mockFrom = vi.fn(() => ({ select: mockSelect }));
  return { mockFrom, mockIlike, mockEq, mockSingle };
});

vi.mock('@supabase/supabase-js', () => {
  return {
    createClient: () => ({
      from: mockFrom,
    }),
  };
});

// Set mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';

import { getUserByUsername } from '../src/lib/supabase';

describe('getUserByUsername', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('performs case-insensitive query and returns user data if found', async () => {
    const mockUser = {
      id: '123',
      github_login: 'priyanshu',
      is_public: true,
    };
    mockSingle.mockResolvedValueOnce({ data: mockUser, error: null });

    const result = await getUserByUsername('PriyanshU');

    expect(mockFrom).toHaveBeenCalledWith('users');
    expect(mockIlike).toHaveBeenCalledWith('github_login', 'PriyanshU');
    expect(mockEq).toHaveBeenCalledWith('is_public', true);
    expect(result).toEqual(mockUser);
  });

  it('returns null and handles no rows found gracefully', async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST116', message: 'No rows found' },
    });

    const result = await getUserByUsername('nonexistent');
    expect(result).toBeNull();
  });
});
