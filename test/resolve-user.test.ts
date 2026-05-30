import { afterEach, describe, expect, it, vi } from "vitest";

describe("resolve-user", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("returns existing user when found in database", async () => {
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue({
      data: { id: "user-123" },
      error: null,
    });
    const mockFrom = vi.fn().mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
    });

    vi.doMock("@/lib/supabase", () => ({
      supabaseAdmin: { from: mockFrom },
    }));

    const { resolveAppUser } = await import("@/lib/resolve-user");
    const result = await resolveAppUser("github-123", "testuser");

    expect(result).toEqual({ id: "user-123" });
  });

  it("upserts new user when not found", async () => {
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockSingle = vi.fn()
      .mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116" },
      })
      .mockResolvedValueOnce({
        data: { id: "new-user-456" },
        error: null,
      });
    const mockFrom = vi.fn().mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
    });
    const mockUpsert = vi.fn().mockReturnThis();
    const mockSelectAfterUpsert = vi.fn().mockReturnThis();
    const mockSingleAfterUpsert = vi.fn().mockResolvedValue({
      data: { id: "new-user-456" },
      error: null,
    });

    vi.doMock("@/lib/supabase", () => ({
      supabaseAdmin: {
        from: (table: string) => {
          if (table === "users") {
            return {
              select: mockSelect,
              eq: mockEq,
              single: mockSingle,
              upsert: mockUpsert.mockReturnValue({
                select: mockSelectAfterUpsert.mockReturnThis(),
                single: mockSingleAfterUpsert,
              }),
            };
          }
          return { select: mockSelect, eq: mockEq, single: mockSingle };
        },
      },
    }));

    const { resolveAppUser } = await import("@/lib/resolve-user");
    const result = await resolveAppUser("github-new", "newuser");

    expect(result).toEqual({ id: "new-user-456" });
  });

  it("returns null when githubLogin is missing", async () => {
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "PGRST116" },
    });
    const mockFrom = vi.fn().mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
    });

    vi.doMock("@/lib/supabase", () => ({
      supabaseAdmin: { from: mockFrom },
    }));

    const { resolveAppUser } = await import("@/lib/resolve-user");
    const result = await resolveAppUser("github-123", undefined as any);

    expect(result).toBeNull();
  });

  it("returns null on database error", async () => {
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "Database error" },
    });
    const mockFrom = vi.fn().mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
    });

    vi.doMock("@/lib/supabase", () => ({
      supabaseAdmin: { from: mockFrom },
    }));

    const { resolveAppUser } = await import("@/lib/resolve-user");
    const result = await resolveAppUser("github-123", "testuser");

    expect(result).toBeNull();
  });
});