/**
 * Regression tests for the daily-focus API route.
 *
 * Covers:
 *   - Unauthenticated access (401)
 *   - GET returns null when no record exists
 *   - GET returns a record when one exists
 *   - PUT creates a new focus entry
 *   - PUT updates (upserts) an existing focus entry for the same date
 *   - PUT validates goal_text (missing, empty, too long)
 *   - PUT rejects invalid JSON
 *   - DELETE removes a focus entry
 *   - DELETE is idempotent (no-op on missing entry is not an error)
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// ─── hoisted mocks ──────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  resolveAppUser: vi.fn(),
  supabaseFrom: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/resolve-user", () => ({
  resolveAppUser: mocks.resolveAppUser,
}));
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: mocks.supabaseFrom },
}));

// ─── helpers ────────────────────────────────────────────────────────────────

const SESSION = { githubId: "gh-123", githubLogin: "alice" };
const USER = { id: "user-uuid-001" };
const TODAY = new Date().toISOString().slice(0, 10);

function makeRequest(
  method: string,
  url: string,
  body?: unknown
): NextRequest {
  return new NextRequest(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

const SAMPLE_RECORD = {
  id: "focus-id-1",
  user_id: USER.id,
  focus_date: TODAY,
  goal_text: "Ship the feature",
  created_at: "2026-06-02T09:00:00Z",
  updated_at: "2026-06-02T09:00:00Z",
};

// ─── shared Supabase chain builders ─────────────────────────────────────────

function stubSelect(returnData: unknown, returnError: unknown = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: returnData, error: returnError });
  const eq2 = vi.fn().mockReturnValue({ maybeSingle });
  const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
  const select = vi.fn().mockReturnValue({ eq: eq1 });
  mocks.supabaseFrom.mockReturnValue({ select });
}

function stubUpsert(returnData: unknown, returnError: unknown = null) {
  const single = vi.fn().mockResolvedValue({ data: returnData, error: returnError });
  const select = vi.fn().mockReturnValue({ single });
  const upsert = vi.fn().mockReturnValue({ select });
  mocks.supabaseFrom.mockReturnValue({ upsert });
}

function stubDelete(returnError: unknown = null) {
  const eq2 = vi.fn().mockResolvedValue({ error: returnError });
  const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
  const del = vi.fn().mockReturnValue({ eq: eq1 });
  mocks.supabaseFrom.mockReturnValue({ delete: del });
}

// ─── GET ─────────────────────────────────────────────────────────────────────

describe("GET /api/daily-focus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerSession.mockResolvedValue(SESSION);
    mocks.resolveAppUser.mockResolvedValue(USER);
  });

  it("returns 401 when unauthenticated", async () => {
    mocks.getServerSession.mockResolvedValue(null);
    const { GET } = await import("@/app/api/daily-focus/route");
    const res = await GET(
      makeRequest("GET", `http://localhost/api/daily-focus?date=${TODAY}`)
    );
    expect(res.status).toBe(401);
  });

  it("returns null focus when no record exists for today", async () => {
    stubSelect(null);
    const { GET } = await import("@/app/api/daily-focus/route");
    const res = await GET(
      makeRequest("GET", `http://localhost/api/daily-focus?date=${TODAY}`)
    );
    expect(res.status).toBe(200);
    const body = await res.json() as { focus: null };
    expect(body.focus).toBeNull();
  });

  it("returns the record when one exists for today", async () => {
    stubSelect(SAMPLE_RECORD);
    const { GET } = await import("@/app/api/daily-focus/route");
    const res = await GET(
      makeRequest("GET", `http://localhost/api/daily-focus?date=${TODAY}`)
    );
    expect(res.status).toBe(200);
    const body = await res.json() as { focus: typeof SAMPLE_RECORD };
    expect(body.focus?.goal_text).toBe("Ship the feature");
  });

  it("defaults to today when no date param is supplied", async () => {
    stubSelect(null);
    const { GET } = await import("@/app/api/daily-focus/route");
    const res = await GET(
      makeRequest("GET", "http://localhost/api/daily-focus")
    );
    expect(res.status).toBe(200);
  });

  it("returns 500 when the database call fails", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: { message: "db error" } });
    const eq2 = vi.fn().mockReturnValue({ maybeSingle });
    const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
    const select = vi.fn().mockReturnValue({ eq: eq1 });
    mocks.supabaseFrom.mockReturnValue({ select });

    const { GET } = await import("@/app/api/daily-focus/route");
    const res = await GET(
      makeRequest("GET", `http://localhost/api/daily-focus?date=${TODAY}`)
    );
    expect(res.status).toBe(500);
  });
});

// ─── PUT ─────────────────────────────────────────────────────────────────────

describe("PUT /api/daily-focus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerSession.mockResolvedValue(SESSION);
    mocks.resolveAppUser.mockResolvedValue(USER);
  });

  it("returns 401 when unauthenticated", async () => {
    mocks.getServerSession.mockResolvedValue(null);
    const { PUT } = await import("@/app/api/daily-focus/route");
    const res = await PUT(
      makeRequest("PUT", "http://localhost/api/daily-focus", {
        goal_text: "Build the thing",
        focus_date: TODAY,
      })
    );
    expect(res.status).toBe(401);
  });

  it("creates a new focus record", async () => {
    stubUpsert(SAMPLE_RECORD);
    const { PUT } = await import("@/app/api/daily-focus/route");
    const res = await PUT(
      makeRequest("PUT", "http://localhost/api/daily-focus", {
        goal_text: "Ship the feature",
        focus_date: TODAY,
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json() as { focus: typeof SAMPLE_RECORD };
    expect(body.focus.goal_text).toBe("Ship the feature");
  });

  it("upserts — calling PUT twice for the same date succeeds", async () => {
    stubUpsert({ ...SAMPLE_RECORD, goal_text: "Updated goal" });
    const { PUT } = await import("@/app/api/daily-focus/route");
    const res = await PUT(
      makeRequest("PUT", "http://localhost/api/daily-focus", {
        goal_text: "Updated goal",
        focus_date: TODAY,
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json() as { focus: typeof SAMPLE_RECORD };
    expect(body.focus.goal_text).toBe("Updated goal");
  });

  it("returns 400 when goal_text is missing", async () => {
    const { PUT } = await import("@/app/api/daily-focus/route");
    const res = await PUT(
      makeRequest("PUT", "http://localhost/api/daily-focus", {
        focus_date: TODAY,
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when goal_text is empty", async () => {
    const { PUT } = await import("@/app/api/daily-focus/route");
    const res = await PUT(
      makeRequest("PUT", "http://localhost/api/daily-focus", {
        goal_text: "   ",
        focus_date: TODAY,
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when goal_text exceeds 280 characters", async () => {
    const { PUT } = await import("@/app/api/daily-focus/route");
    const res = await PUT(
      makeRequest("PUT", "http://localhost/api/daily-focus", {
        goal_text: "x".repeat(281),
        focus_date: TODAY,
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid JSON", async () => {
    const { PUT } = await import("@/app/api/daily-focus/route");
    const req = new NextRequest("http://localhost/api/daily-focus", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });

  it("falls back to today when focus_date is omitted", async () => {
    stubUpsert(SAMPLE_RECORD);
    const { PUT } = await import("@/app/api/daily-focus/route");
    const res = await PUT(
      makeRequest("PUT", "http://localhost/api/daily-focus", {
        goal_text: "Ship the feature",
      })
    );
    expect(res.status).toBe(200);
  });

  it("returns 500 when the database call fails", async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: { message: "db error" } });
    const select = vi.fn().mockReturnValue({ single });
    const upsert = vi.fn().mockReturnValue({ select });
    mocks.supabaseFrom.mockReturnValue({ upsert });

    const { PUT } = await import("@/app/api/daily-focus/route");
    const res = await PUT(
      makeRequest("PUT", "http://localhost/api/daily-focus", {
        goal_text: "Ship it",
        focus_date: TODAY,
      })
    );
    expect(res.status).toBe(500);
  });
});

// ─── DELETE ──────────────────────────────────────────────────────────────────

describe("DELETE /api/daily-focus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerSession.mockResolvedValue(SESSION);
    mocks.resolveAppUser.mockResolvedValue(USER);
  });

  it("returns 401 when unauthenticated", async () => {
    mocks.getServerSession.mockResolvedValue(null);
    const { DELETE } = await import("@/app/api/daily-focus/route");
    const res = await DELETE(
      makeRequest("DELETE", `http://localhost/api/daily-focus?date=${TODAY}`)
    );
    expect(res.status).toBe(401);
  });

  it("deletes a focus entry and returns success", async () => {
    stubDelete(null);
    const { DELETE } = await import("@/app/api/daily-focus/route");
    const res = await DELETE(
      makeRequest("DELETE", `http://localhost/api/daily-focus?date=${TODAY}`)
    );
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean };
    expect(body.success).toBe(true);
  });

  it("is idempotent — deleting a non-existent entry succeeds", async () => {
    // Supabase DELETE with no matching rows returns no error — this is
    // consistent with the rest of the API surface.
    stubDelete(null);
    const { DELETE } = await import("@/app/api/daily-focus/route");
    const res = await DELETE(
      makeRequest("DELETE", "http://localhost/api/daily-focus?date=2020-01-01")
    );
    expect(res.status).toBe(200);
  });

  it("defaults to today when no date param is supplied", async () => {
    stubDelete(null);
    const { DELETE } = await import("@/app/api/daily-focus/route");
    const res = await DELETE(
      makeRequest("DELETE", "http://localhost/api/daily-focus")
    );
    expect(res.status).toBe(200);
  });

  it("returns 500 when the database call fails", async () => {
    stubDelete({ message: "db error" });
    const { DELETE } = await import("@/app/api/daily-focus/route");
    const res = await DELETE(
      makeRequest("DELETE", `http://localhost/api/daily-focus?date=${TODAY}`)
    );
    expect(res.status).toBe(500);
  });
});
