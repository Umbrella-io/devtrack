import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createHash } from "crypto";
import { POST } from "@/app/api/local-coding/keys/route";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  resolveAppUser: vi.fn(),
  from: vi.fn(),
  countEq: vi.fn(),
  insert: vi.fn(),
  insertSelect: vi.fn(),
  insertSingle: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession: mocks.getServerSession,
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/resolve-user", () => ({
  resolveAppUser: mocks.resolveAppUser,
}));

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: mocks.from,
  },
}));

function createRequest(name: string) {
  return new NextRequest("http://localhost/api/local-coding/keys", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

describe("Local Coding Keys POST API Endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getServerSession.mockResolvedValue({
      githubId: "12345",
      githubLogin: "test-user",
    });
    mocks.resolveAppUser.mockResolvedValue({ id: "user-1" });
    mocks.countEq.mockResolvedValue({ count: 0, error: null });
    mocks.insertSingle.mockResolvedValue({
      data: {
        id: "key-1",
        name: "Laptop",
        last_used_at: null,
        created_at: "2026-05-29T00:00:00.000Z",
      },
      error: null,
    });

    mocks.from.mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: mocks.countEq }),
      insert: mocks.insert,
    });
    mocks.insert.mockReturnValue({ select: mocks.insertSelect });
    mocks.insertSelect.mockReturnValue({ single: mocks.insertSingle });
  });

  it("stores the hash in api_key_hash and a display prefix in api_key", async () => {
    const res = await POST(createRequest("  Laptop  "));
    const body = await res.json();
    const returnedApiKey = body.key.api_key;
    const expectedHash = createHash("sha256").update(returnedApiKey).digest("hex");
    const expectedPrefix = returnedApiKey.slice(0, 8);

    expect(res.status).toBe(200);
    // api_key_hash must hold the SHA-256 digest for authentication.
    // api_key must hold only the non-sensitive display prefix -- never the hash.
    expect(mocks.insert).toHaveBeenCalledWith({
      user_id: "user-1",
      api_key: expectedPrefix,
      api_key_hash: expectedHash,
      name: "Laptop",
    });
    expect(body.message).toContain("Store this API key securely");
  });

  it("does not write the hash into api_key (prevents credential exposure via display column)", async () => {
    const res = await POST(createRequest("Work Laptop"));
    const body = await res.json();
    const hash = createHash("sha256").update(body.key.api_key).digest("hex");
    const insertCall = mocks.insert.mock.calls[0][0];
    expect(insertCall.api_key).not.toBe(hash);
    expect(insertCall.api_key_hash).toBe(hash);
  });
});
