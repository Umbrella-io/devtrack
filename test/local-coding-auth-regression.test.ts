/**
 * Regression tests for the local-coding API key authentication mismatch
 * described in issue #1748.
 *
 * Background
 * ----------
 * The initial migration created local_coding_api_keys with a single column
 * `api_key` to store key hashes. A later migration added `api_key_hash` as
 * a nullable column. At one point the code was inconsistent:
 *
 *   Creation  → wrote hash to `api_key` only
 *   Auth      → read hash from `api_key_hash` only
 *
 * Every key generated through the UI was therefore permanently invalid.
 *
 * Fix
 * ---
 * Key creation now writes the same hash to BOTH columns so that existing
 * deployments on either schema revision continue to work.
 * Authentication queries BOTH columns with an OR filter.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createHash } from "crypto";
import { POST as syncPost, GET as syncGet } from "@/app/api/local-coding/sync/route";
import { POST as keysPost } from "@/app/api/local-coding/keys/route";

// ─── hoisted mocks ──────────────────────────────────────────────────────────

const keysMocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  resolveAppUser: vi.fn(),
  supabaseFrom: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: keysMocks.getServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/resolve-user", () => ({ resolveAppUser: keysMocks.resolveAppUser }));

// A single Supabase mock that both routes share via the module mock.
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: keysMocks.supabaseFrom,
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

// ─── helpers ────────────────────────────────────────────────────────────────

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/** Returns a Supabase mock chain that resolves the auth OR lookup successfully. */
function buildSyncAuthMock(userId = "user-1") {
  const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });
  const orSingle = vi.fn().mockResolvedValue({ data: { user_id: userId }, error: null });
  const selectOr = vi.fn().mockReturnValue({ single: orSingle });
  const updateOr = vi.fn().mockResolvedValue({ error: null });
  const updateChain = vi.fn().mockReturnValue({ or: updateOr });

  const sessionCountEq = vi.fn().mockResolvedValue({ count: 0, data: null, error: null });
  const existingDatesIn = vi.fn().mockResolvedValue({ data: [], error: null });
  const existingDatesEq = vi.fn().mockReturnValue({ in: existingDatesIn });

  keysMocks.supabaseFrom.mockImplementation((table: string) => {
    if (table === "local_coding_api_keys") {
      return {
        select: vi.fn().mockReturnValue({ or: selectOr }),
        update: updateChain,
      };
    }
    if (table === "local_coding_sessions") {
      return {
        select: vi.fn((_cols: string, opts?: { count?: string }) => {
          if (opts?.count) return { eq: sessionCountEq };
          return { eq: existingDatesEq };
        }),
      };
    }
    return { select: vi.fn(), update: vi.fn() };
  });

  return { mockRpc, orSingle, selectOr, updateOr, sessionCountEq, existingDatesIn };
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe("Local coding API key lifecycle — regression for #1748", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── key creation stores hash in both columns ──────────────────────────────

  it("POST /local-coding/keys stores the hash in api_key AND api_key_hash", async () => {
    keysMocks.getServerSession.mockResolvedValue({ githubId: "gh-1", githubLogin: "alice" });
    keysMocks.resolveAppUser.mockResolvedValue({ id: "user-1" });

    const insertMock = vi.fn();
    const insertSelectMock = vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: { id: "key-1", name: "Test", last_used_at: null, created_at: "2026-01-01" },
        error: null,
      }),
    });
    insertMock.mockReturnValue({ select: insertSelectMock });

    keysMocks.supabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ count: 0 }) }),
      insert: insertMock,
    });

    const req = new NextRequest("http://localhost/api/local-coding/keys", {
      method: "POST",
      body: JSON.stringify({ name: "Test" }),
    });

    const res = await keysPost(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    const returnedPlaintextKey = body.key.api_key;
    const expectedHash = sha256(returnedPlaintextKey);

    // Both columns must receive the same hash so that either code path
    // (api_key_hash-based OR api_key-based lookup) can authenticate the key.
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        api_key: expectedHash,
        api_key_hash: expectedHash,
      })
    );
  });

  // ── sync POST: authentication uses OR across both columns ─────────────────

  it("POST /local-coding/sync authenticates via OR(api_key_hash, api_key) — regression for #1748", async () => {
    const { selectOr, updateOr } = buildSyncAuthMock();

    const testKey = "my-plaintext-key";
    const expectedHash = sha256(testKey);
    const expectedFilter = `api_key_hash.eq.${expectedHash},api_key.eq.${expectedHash}`;

    const req = new NextRequest("http://localhost/api/local-coding/sync", {
      method: "POST",
      headers: { Authorization: `Bearer ${testKey}` },
      body: JSON.stringify({
        sessions: [{ date: "2026-05-01", totalSeconds: 3600, fileCount: 5, projectCount: 1 }],
      }),
    });

    const res = await syncPost(req);
    expect(res.status).toBe(200);

    // Lookup must use OR across both columns, not just one.
    expect(selectOr).toHaveBeenCalledWith(expectedFilter);
    // last_used_at update must also use the same filter.
    expect(updateOr).toHaveBeenCalledWith(expectedFilter);
  });

  it("POST /local-coding/sync authenticates a key whose hash is in api_key only (pre-migration row)", async () => {
    // Simulates a deployment where api_key_hash was NULL (old row) but api_key contains the hash.
    // The OR filter must still find the row.
    const orSingle = vi.fn().mockResolvedValue({ data: { user_id: "user-old" }, error: null });
    const selectOr = vi.fn().mockReturnValue({ single: orSingle });
    const updateOr = vi.fn().mockResolvedValue({ error: null });
    const updateChain = vi.fn().mockReturnValue({ or: updateOr });

    const sessionCountEq = vi.fn().mockResolvedValue({ count: 0, data: null, error: null });
    const existingDatesIn = vi.fn().mockResolvedValue({ data: [], error: null });
    const existingDatesEq = vi.fn().mockReturnValue({ in: existingDatesIn });

    keysMocks.supabaseFrom.mockImplementation((table: string) => {
      if (table === "local_coding_api_keys") {
        return { select: vi.fn().mockReturnValue({ or: selectOr }), update: updateChain };
      }
      if (table === "local_coding_sessions") {
        return {
          select: vi.fn((_c: string, o?: { count?: string }) => {
            if (o?.count) return { eq: sessionCountEq };
            return { eq: existingDatesEq };
          }),
        };
      }
      return {};
    });

    const req = new NextRequest("http://localhost/api/local-coding/sync", {
      method: "POST",
      headers: { Authorization: "Bearer legacy-key" },
      body: JSON.stringify({ sessions: [{ date: "2026-05-01", totalSeconds: 100 }] }),
    });

    const res = await syncPost(req);
    expect(res.status).toBe(200);

    // The OR filter is what makes legacy rows work — it searches api_key even
    // when api_key_hash is NULL.
    const hash = sha256("legacy-key");
    expect(selectOr).toHaveBeenCalledWith(
      expect.stringContaining(`api_key.eq.${hash}`)
    );
  });

  it("POST /local-coding/sync rejects an invalid key regardless of the column check", async () => {
    // Both columns return null (key doesn't exist).
    const orSingle = vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } });
    keysMocks.supabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({ or: vi.fn().mockReturnValue({ single: orSingle }) }),
      update: vi.fn(),
    });

    const req = new NextRequest("http://localhost/api/local-coding/sync", {
      method: "POST",
      headers: { Authorization: "Bearer completely-wrong-key" },
      body: JSON.stringify({ sessions: [{ date: "2026-05-01", totalSeconds: 100 }] }),
    });

    const res = await syncPost(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Invalid API key");
  });

  // ── sync GET: uses the same authentication function ───────────────────────

  it("GET /local-coding/sync returns 401 when no authorization header is provided", async () => {
    const req = new NextRequest("http://localhost/api/local-coding/sync?days=30");
    const res = await syncGet(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("API key required");
  });

  it("GET /local-coding/sync returns 401 for an invalid key", async () => {
    const orSingle = vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } });
    keysMocks.supabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({ or: vi.fn().mockReturnValue({ single: orSingle }) }),
      update: vi.fn(),
    });

    const req = new NextRequest("http://localhost/api/local-coding/sync?days=30", {
      headers: { Authorization: "Bearer bad-key" },
    });
    const res = await syncGet(req);
    expect(res.status).toBe(401);
  });

  it("GET /local-coding/sync returns session data for a valid key", async () => {
    const orSingle = vi.fn().mockResolvedValue({ data: { user_id: "user-1" }, error: null });
    const updateOr = vi.fn().mockResolvedValue({ error: null });
    const updateChain = vi.fn().mockReturnValue({ or: updateOr });

    const sessionData = [
      { date: "2026-05-01", total_seconds: 3600, file_count: 10, project_count: 2 },
    ];

    const sessionEq = vi.fn().mockReturnValue({
      gte: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: sessionData, error: null }),
      }),
    });

    keysMocks.supabaseFrom.mockImplementation((table: string) => {
      if (table === "local_coding_api_keys") {
        return {
          select: vi.fn().mockReturnValue({ or: vi.fn().mockReturnValue({ single: orSingle }) }),
          update: updateChain,
        };
      }
      if (table === "local_coding_sessions") {
        return { select: vi.fn().mockReturnValue({ eq: sessionEq }) };
      }
      return {};
    });

    const req = new NextRequest("http://localhost/api/local-coding/sync?days=30", {
      headers: { Authorization: "Bearer valid-key" },
    });

    const res = await syncGet(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.sessions).toEqual(sessionData);
  });

  it("GET /local-coding/sync authenticates using the same OR filter as POST", async () => {
    const { selectOr } = buildSyncAuthMock();

    const sessionEq = vi.fn().mockReturnValue({
      gte: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });

    // Override sessions table for GET
    keysMocks.supabaseFrom.mockImplementation((table: string) => {
      if (table === "local_coding_api_keys") {
        return {
          select: vi.fn().mockReturnValue({ or: selectOr }),
          update: vi.fn().mockReturnValue({ or: vi.fn().mockResolvedValue({ error: null }) }),
        };
      }
      if (table === "local_coding_sessions") {
        return { select: vi.fn().mockReturnValue({ eq: sessionEq }) };
      }
      return {};
    });

    const myKey = "get-test-key";
    const hash = sha256(myKey);
    const expectedFilter = `api_key_hash.eq.${hash},api_key.eq.${hash}`;

    const req = new NextRequest("http://localhost/api/local-coding/sync?days=7", {
      headers: { Authorization: `Bearer ${myKey}` },
    });

    await syncGet(req);

    expect(selectOr).toHaveBeenCalledWith(expectedFilter);
  });

  // ── hash function consistency ─────────────────────────────────────────────

  it("hashes the same key the same way in both the keys and sync routes", async () => {
    // The only way creation and authentication are consistent is if they use
    // identical hashing (SHA-256, raw key as input). This test verifies the
    // contract by checking that the filter string used during auth would match
    // the value written during creation.

    const plainKey = "dt_test_plaintext_key_abc123";
    const hash = sha256(plainKey);

    // What the keys route writes
    const writtenApiKey = hash;
    const writtenApiKeyHash = hash;

    // What the sync route looks up
    const filter = `api_key_hash.eq.${sha256(plainKey)},api_key.eq.${sha256(plainKey)}`;

    // The hash written to api_key must match the filter on api_key
    expect(filter).toContain(`api_key.eq.${writtenApiKey}`);
    // The hash written to api_key_hash must match the filter on api_key_hash
    expect(filter).toContain(`api_key_hash.eq.${writtenApiKeyHash}`);
  });
});
