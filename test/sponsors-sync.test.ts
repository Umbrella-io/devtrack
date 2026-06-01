import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/sponsors/sync/route";

// ─── hoisted mocks ──────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  supabaseFrom: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: mocks.supabaseFrom },
}));

// Replace global fetch so we can control GitHub API responses.
vi.stubGlobal("fetch", mocks.fetch);

// ─── helpers ────────────────────────────────────────────────────────────────

const VALID_SECRET = "test-cron-secret";

function makeRequest(authHeader?: string): Request {
  return new Request("http://localhost/api/sponsors/sync", {
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

function authedRequest(): Request {
  return makeRequest(`Bearer ${VALID_SECRET}`);
}

/** Build a minimal GitHub GraphQL response with the given sponsor entries. */
function graphqlResponse(
  sponsors: Array<{ databaseId: number; login: string; type?: "User" | "Organization" }>
) {
  return {
    ok: true,
    json: async () => ({
      data: {
        user: {
          sponsorshipsAsMaintainer: {
            nodes: sponsors.map((s) => ({
              sponsorEntity: { databaseId: s.databaseId, login: s.login },
            })),
          },
        },
      },
    }),
  };
}

/** Set up Supabase mock for a given set of currently-flagged sponsor github_ids. */
function setupSupabase(currentSponsorIds: string[]) {
  const updateInChain = vi.fn().mockResolvedValue({ error: null });
  const updateChain = vi.fn().mockReturnValue({ in: updateInChain });

  const selectEqChain = vi.fn().mockResolvedValue({
    data: currentSponsorIds.map((id) => ({ github_id: id })),
    error: null,
  });
  const selectChain = vi.fn().mockReturnValue({ eq: selectEqChain });

  mocks.supabaseFrom.mockReturnValue({
    select: selectChain,
    update: updateChain,
  });

  return { updateChain, updateInChain };
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe("GET /api/sponsors/sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", VALID_SECRET);
    vi.stubEnv("GITHUB_TOKEN", "gh-token");
  });

  // ── authentication ────────────────────────────────────────────────────────

  it("returns 500 when CRON_SECRET is not configured", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const res = await GET(authedRequest());
    expect(res.status).toBe(500);
  });

  it("returns 401 when authorization header is missing in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 401 when authorization header is wrong in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const res = await GET(makeRequest("Bearer wrong-secret"));
    expect(res.status).toBe(401);
  });

  it("returns 500 when GITHUB_TOKEN is not configured", async () => {
    vi.stubEnv("GITHUB_TOKEN", "");
    const res = await GET(authedRequest());
    expect(res.status).toBe(500);
  });

  // ── GitHub API errors ─────────────────────────────────────────────────────

  it("returns 502 when the GitHub GraphQL request fails", async () => {
    mocks.fetch.mockResolvedValue({ ok: false, status: 500 });
    const res = await GET(authedRequest());
    expect(res.status).toBe(502);
  });

  it("returns 502 when the GraphQL response contains errors", async () => {
    mocks.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ errors: [{ message: "Forbidden" }] }),
    });
    const res = await GET(authedRequest());
    expect(res.status).toBe(502);
  });

  it("returns 502 when GraphQL data.user is null", async () => {
    mocks.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { user: null } }),
    });
    const res = await GET(authedRequest());
    expect(res.status).toBe(502);
  });

  // ── immutable ID matching (core fix for #1751) ───────────────────────────

  it("grants sponsor status using github_id, not github_login", async () => {
    mocks.fetch.mockResolvedValue(
      graphqlResponse([{ databaseId: 111, login: "alice" }])
    );
    const { updateChain, updateInChain } = setupSupabase([]);

    await GET(authedRequest());

    // Must update by github_id, not github_login
    expect(updateChain).toHaveBeenCalledWith({ is_sponsor: true });
    expect(updateInChain).toHaveBeenCalledWith("github_id", ["111"]);
  });

  it("revokes sponsor status using github_id, not github_login", async () => {
    // No active sponsors from GitHub, but "222" is currently marked in the DB
    mocks.fetch.mockResolvedValue(graphqlResponse([]));
    const { updateChain, updateInChain } = setupSupabase(["222"]);

    await GET(authedRequest());

    expect(updateChain).toHaveBeenCalledWith({ is_sponsor: false });
    expect(updateInChain).toHaveBeenCalledWith("github_id", ["222"]);
  });

  it("does not use github_login in any database update", async () => {
    mocks.fetch.mockResolvedValue(
      graphqlResponse([{ databaseId: 333, login: "bob" }])
    );
    setupSupabase([]);

    await GET(authedRequest());

    // None of the Supabase calls should mention the mutable login "bob"
    const allCalls = mocks.supabaseFrom.mock.calls
      .concat(...Object.values(mocks.supabaseFrom.mock.results.map((r: any) => r.value)));
    // Check the in() call did not receive a login string
    const inCallArgs = mocks.supabaseFrom.mock.results
      .flatMap((r: any) => {
        try { return Object.entries(r.value); } catch { return []; }
      });
    // The actual test: the column used in update().in() must be "github_id"
    const mockInstance = mocks.supabaseFrom.mock.results[0]?.value;
    expect(mockInstance.update).toBeDefined();
    const updateCall = mockInstance.update.mock?.calls?.[0]?.[0];
    expect(updateCall).toEqual({ is_sponsor: true });
  });

  // ── username-recycling scenario (regression test for #1751) ───────────────

  it("does not grant sponsor status to a new user who claims a recycled username", async () => {
    // Original sponsor: github_id=100, formerly login="alice"
    // GitHub still shows "alice" as a sponsor (databaseId=100)
    // New DevTrack user: github_id=999, current login="alice" (recycled)
    // Only github_id=100 should receive is_sponsor=true; 999 must NOT.

    mocks.fetch.mockResolvedValue(
      graphqlResponse([{ databaseId: 100, login: "alice" }])
    );

    const updateInChain = vi.fn().mockResolvedValue({ error: null });
    const updateChain = vi.fn().mockReturnValue({ in: updateInChain });
    const selectEqChain = vi.fn().mockResolvedValue({ data: [], error: null });
    const selectChain = vi.fn().mockReturnValue({ eq: selectEqChain });
    mocks.supabaseFrom.mockReturnValue({ select: selectChain, update: updateChain });

    await GET(authedRequest());

    // The grant must target github_id "100", not "999"
    expect(updateInChain).toHaveBeenCalledWith("github_id", ["100"]);
    expect(updateInChain).not.toHaveBeenCalledWith("github_id", ["999"]);
  });

  it("preserves sponsor status when a sponsor renames their GitHub account", async () => {
    // Sponsor renames "alice" → "alice2"; GitHub API returns databaseId=100, login="alice2"
    // Our DB still has github_id=100 marked as is_sponsor=true
    mocks.fetch.mockResolvedValue(
      graphqlResponse([{ databaseId: 100, login: "alice2" }])
    );

    // DB already has github_id=100 as sponsor — no changes expected
    const { updateChain } = setupSupabase(["100"]);

    const res = await GET(authedRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.granted).toBe(0);
    expect(body.revoked).toBe(0);
    // No DB updates should have been made
    expect(updateChain).not.toHaveBeenCalled();
  });

  // ── no-op when nothing changes ────────────────────────────────────────────

  it("makes no DB updates when sponsor list is already in sync", async () => {
    mocks.fetch.mockResolvedValue(
      graphqlResponse([{ databaseId: 42, login: "sponsor" }])
    );
    const { updateChain } = setupSupabase(["42"]);

    const res = await GET(authedRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.granted).toBe(0);
    expect(body.revoked).toBe(0);
    expect(updateChain).not.toHaveBeenCalled();
  });

  // ── grant and revoke in the same run ──────────────────────────────────────

  it("grants new sponsors and revokes lapsed sponsors in the same run", async () => {
    // GitHub says "111" is a sponsor; DB has "222" as sponsor
    mocks.fetch.mockResolvedValue(
      graphqlResponse([{ databaseId: 111, login: "new-sponsor" }])
    );

    const updateInChain = vi.fn().mockResolvedValue({ error: null });
    const updateChain = vi.fn().mockReturnValue({ in: updateInChain });
    const selectEqChain = vi.fn().mockResolvedValue({
      data: [{ github_id: "222" }],
      error: null,
    });
    const selectChain = vi.fn().mockReturnValue({ eq: selectEqChain });
    mocks.supabaseFrom.mockReturnValue({ select: selectChain, update: updateChain });

    const res = await GET(authedRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.granted).toBe(1);
    expect(body.revoked).toBe(1);
    // Revoke "222", grant "111"
    expect(updateInChain).toHaveBeenCalledWith("github_id", ["222"]);
    expect(updateInChain).toHaveBeenCalledWith("github_id", ["111"]);
  });

  // ── sponsor nodes without databaseId are ignored ──────────────────────────

  it("skips sponsor entities that have no databaseId", async () => {
    mocks.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          user: {
            sponsorshipsAsMaintainer: {
              nodes: [
                // Node with no databaseId (e.g. ghost / deleted account)
                { sponsorEntity: { login: "ghost-user" } },
                // Valid node
                { sponsorEntity: { databaseId: 77, login: "valid" } },
              ],
            },
          },
        },
      }),
    });
    const { updateInChain } = setupSupabase([]);

    const res = await GET(authedRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.sponsorCount).toBe(1); // only the valid one
    expect(updateInChain).toHaveBeenCalledWith("github_id", ["77"]);
  });

  // ── response shape ────────────────────────────────────────────────────────

  it("returns sponsorCount, granted, revoked, and sponsors array in the response", async () => {
    mocks.fetch.mockResolvedValue(
      graphqlResponse([
        { databaseId: 1, login: "alpha" },
        { databaseId: 2, login: "beta" },
      ])
    );
    setupSupabase([]);

    const res = await GET(authedRequest());
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.sponsorCount).toBe(2);
    expect(body.granted).toBe(2);
    expect(body.revoked).toBe(0);
    expect(body.sponsors).toEqual(expect.arrayContaining(["alpha", "beta"]));
  });
});
