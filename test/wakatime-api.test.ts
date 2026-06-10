import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/wakatime/route";
import { getServerSession } from "next-auth";

// Mock next-auth
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

// We'll mock "@/lib/supabase" so we can test both when isSupabaseAdminAvailable is true and false.
const mockSingle = vi.fn();
const mockOrder = vi.fn();
const mockGte = vi.fn().mockReturnValue({ order: mockOrder });
const mockEq = vi.fn().mockImplementation((col: string, val: any) => {
  if (col === "github_id") {
    return { single: mockSingle };
  }
  return { gte: mockGte };
});
const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
const mockFrom = vi.fn().mockImplementation((table: string) => {
  return {
    select: mockSelect,
  };
});

let mockIsSupabaseAdminAvailable = true;

vi.mock("@/lib/supabase", () => ({
  get isSupabaseAdminAvailable() {
    return mockIsSupabaseAdminAvailable;
  },
  supabaseAdmin: {
    from: (table: string) => mockFrom(table),
  },
}));

describe("Wakatime API Endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsSupabaseAdminAvailable = true;

    // Reset chains
    mockSelect.mockReturnValue({
      eq: mockEq,
    });
    mockEq.mockImplementation((col: string, val: any) => {
      if (col === "github_id") {
        return { single: mockSingle };
      }
      return { gte: mockGte };
    });
    mockGte.mockReturnValue({
      order: mockOrder,
    });
  });

  it("returns 200 with fallback data when isSupabaseAdminAvailable is false", async () => {
    mockIsSupabaseAdminAvailable = false;

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({
      hasData: false,
      not_configured: true,
    });
  });

  it("returns 401 Unauthorized when session is missing", async () => {
    (getServerSession as any).mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toEqual({ error: "Unauthorized" });
  });

  it("returns wakatime stats when credentials are valid and stats exist", async () => {
    (getServerSession as any).mockResolvedValue({
      githubId: "12345",
    });

    // Mock user select
    mockSingle.mockResolvedValue({
      data: {
        id: "user-uuid-123",
        wakatime_api_key_encrypted: "some-encrypted-key",
      },
      error: null,
    });

    // Mock stats select
    mockOrder.mockResolvedValue({
      data: [
        {
          date: "2026-06-03",
          total_seconds: 3600,
          languages: [{ name: "TypeScript", total_seconds: 3600 }],
          projects: [{ name: "devtrack", total_seconds: 3600 }],
        },
      ],
      error: null,
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.hasData).toBe(true);
    expect(json.todaysSeconds).toBe(3600);
    expect(json.topLanguage).toBe("TypeScript");
    expect(json.topProject).toBe("devtrack");
  });
});
