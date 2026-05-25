import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock Supabase admin client
const mockSingle = vi.fn();
const mockEq = vi.fn(() => ({ single: mockSingle }));
const mockSelect = vi.fn(() => ({
  eq: mockEq,
  single: mockSingle,
}));
const mockUpsert = vi.fn(() => ({ select: mockSelect }));

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table) => {
      if (table === "users") {
        return {
          select: mockSelect,
          upsert: mockUpsert,
        };
      }
    }),
  },
}));

import { resolveAppUser } from "@/lib/resolve-user";

describe("resolveAppUser function", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns existing user when found", async () => {
    mockSingle.mockResolvedValueOnce({ data: { id: "user-123" } });

    const result = await resolveAppUser("github-id-1");

    expect(result).toEqual({ id: "user-123" });
    expect(mockSelect).toHaveBeenCalledWith("id");
    expect(mockEq).toHaveBeenCalledWith("github_id", "github-id-1");
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("upserts and returns user when existing is not found", async () => {
    // First call (find existing) returns null data
    mockSingle.mockResolvedValueOnce({ data: null });
    // Second call (select after upsert) returns upserted user
    mockSingle.mockResolvedValueOnce({ data: { id: "user-new" } });

    const result = await resolveAppUser("github-id-2", "octocat");

    expect(result).toEqual({ id: "user-new" });
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        github_id: "github-id-2",
        github_login: "octocat",
      }),
      { onConflict: "github_id" }
    );
  });
});
