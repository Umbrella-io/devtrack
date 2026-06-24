import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PATCH } from "@/app/api/user/settings/route";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { resolveAppUser } from "@/lib/resolve-user";
import { DEFAULT_WIDGET_PREFS } from "@/lib/widget-prefs";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/resolve-user", () => ({ resolveAppUser: vi.fn() }));
vi.mock("@/lib/crypto", () => ({
  encryptToken: vi.fn().mockReturnValue({ encrypted: "enc", iv: "iv" }),
}));
vi.mock("@/lib/leaderboard", () => ({ clearLeaderboardCache: vi.fn() }));
vi.mock("@/lib/metrics-cache", () => ({
  cacheGet: vi.fn().mockResolvedValue(null),
  cacheSet: vi.fn().mockResolvedValue(undefined),
  cacheDelete: vi.fn().mockResolvedValue(undefined),
}));

const mockSelectSingle = vi.fn();
const mockSelectEq = vi.fn().mockReturnValue({ single: mockSelectSingle });
const mockSelect = vi.fn().mockReturnValue({ eq: mockSelectEq });

const mockUpdateSingle = vi.fn();
const mockUpdateSelectFn = vi.fn().mockReturnValue({ single: mockUpdateSingle });
const mockUpdateEq = vi.fn().mockReturnValue({ select: mockUpdateSelectFn });
const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: () => ({ select: mockSelect, update: mockUpdate }),
  },
}));

const BASE_DB_ROW = {
  id: "user-123",
  github_login: "testuser",
  is_public: false,
  public_since: null,
  show_weekly_goals: false,
  bio: "",
  leaderboard_opt_in: false,
  weekly_digest_opt_in: false,
  pinned_repos: [],
  wakatime_api_key_encrypted: null,
  wakatime_api_key_iv: null,
  discord_webhook_url: null,
  timezone: "UTC",
  webhook_url: null,
  discord_muted_until: null,
  user_widget_prefs: null,
};

const makeReq = (method: string, body?: unknown) =>
  new NextRequest("http://localhost/api/user/settings", {
    method,
    ...(body
      ? { body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }
      : {}),
  });

describe("GET /api/user/settings — widget prefs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue({ eq: mockSelectEq });
    mockSelectEq.mockReturnValue({ single: mockSelectSingle });
    mockUpdate.mockReturnValue({ eq: mockUpdateEq });
    mockUpdateEq.mockReturnValue({ select: mockUpdateSelectFn });
    mockUpdateSelectFn.mockReturnValue({ single: mockUpdateSingle });
    vi.mocked(getServerSession).mockResolvedValue({ githubId: "gh-1", githubLogin: "testuser" } as any);
    vi.mocked(resolveAppUser).mockResolvedValue({ id: "user-123" } as any);
  });

  it("returns DEFAULT_WIDGET_PREFS when DB column is null", async () => {
    mockSelectSingle.mockResolvedValue({ data: { ...BASE_DB_ROW, user_widget_prefs: null }, error: null });
    const res = await GET(makeReq("GET"));
    const body = await res.json();
    expect(body.user_widget_prefs).toEqual(DEFAULT_WIDGET_PREFS);
  });

  it("merges stored prefs — contributionGraph:false while others remain true", async () => {
    mockSelectSingle.mockResolvedValue({
      data: { ...BASE_DB_ROW, user_widget_prefs: { contributionGraph: false } },
      error: null,
    });
    const res = await GET(makeReq("GET"));
    const body = await res.json();
    expect(body.user_widget_prefs.contributionGraph).toBe(false);
    expect(body.user_widget_prefs.streakTracker).toBe(true);
  });

  it("returns DEFAULT_WIDGET_PREFS when tier1 column missing (42703 fallback)", async () => {
    mockSelectSingle
      .mockResolvedValueOnce({ data: null, error: { code: "42703", message: "column missing" } })
      .mockResolvedValueOnce({ data: null, error: { code: "42703", message: "column missing" } })
      .mockResolvedValueOnce({ data: { ...BASE_DB_ROW }, error: null });
    const res = await GET(makeReq("GET"));
    const body = await res.json();
    expect(body.user_widget_prefs).toEqual(DEFAULT_WIDGET_PREFS);
  });
});

describe("PATCH /api/user/settings — widget prefs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue({ eq: mockSelectEq });
    mockSelectEq.mockReturnValue({ single: mockSelectSingle });
    mockUpdate.mockReturnValue({ eq: mockUpdateEq });
    mockUpdateEq.mockReturnValue({ select: mockUpdateSelectFn });
    mockUpdateSelectFn.mockReturnValue({ single: mockUpdateSingle });
    vi.mocked(getServerSession).mockResolvedValue({ githubId: "gh-1", githubLogin: "testuser" } as any);
    vi.mocked(resolveAppUser).mockResolvedValue({ id: "user-123" } as any);
    mockSelectSingle.mockResolvedValue({ data: { ...BASE_DB_ROW }, error: null });
    mockUpdateSingle.mockResolvedValue({
      data: { ...BASE_DB_ROW, user_widget_prefs: { contributionGraph: false } },
      error: null,
    });
  });

  it("returns 400 for unknown widget key", async () => {
    const res = await PATCH(makeReq("PATCH", { user_widget_prefs: { unknownWidget: true } }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Unknown widget key");
  });

  it("returns 400 for non-boolean widget value", async () => {
    const res = await PATCH(makeReq("PATCH", { user_widget_prefs: { contributionGraph: "yes" } }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("must be a boolean");
  });

  it("accepts valid partial widget prefs and returns 200", async () => {
    const res = await PATCH(makeReq("PATCH", { user_widget_prefs: { contributionGraph: false } }));
    expect(res.status).toBe(200);
  });

  it("response includes user_widget_prefs after successful PATCH", async () => {
    const res = await PATCH(makeReq("PATCH", { user_widget_prefs: { contributionGraph: false } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("user_widget_prefs");
  });

  it("falls back gracefully when DB lacks widget_prefs column", async () => {
    mockSelectSingle
      .mockResolvedValueOnce({ data: null, error: { code: "42703", message: "column missing" } })
      .mockResolvedValueOnce({ data: null, error: { code: "42703", message: "column missing" } })
      .mockResolvedValueOnce({ data: { ...BASE_DB_ROW }, error: null });
    const res = await PATCH(makeReq("PATCH", {
      user_widget_prefs: { contributionGraph: false },
      show_weekly_goals: true,
    }));
    expect(res.status).toBe(200);
  });
});
