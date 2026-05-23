import { beforeEach, describe, expect, it, vi } from "vitest";

const fromMock = vi.fn();
const supabaseAdmin = {
  from: fromMock,
};

vi.mock("../src/lib/supabase", () => ({
  supabaseAdmin,
}));

const { resolveAppUser } = await import("../src/lib/resolve-user");

function createExistingChain(result: unknown) {
  const single = vi.fn(async () => result);
  const eq = vi.fn(() => ({ single }));
  const select = vi.fn(() => ({ eq }));
  return { select, eq, single };
}

function createUpsertChain(result: unknown) {
  const single = vi.fn(async () => result);
  const select = vi.fn(() => ({ single }));
  const upsert = vi.fn(() => ({ select }));
  return { upsert, select, single };
}

describe("resolveAppUser", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it("returns null when user not found and githubLogin is null", async () => {
    const existingChain = createExistingChain({ data: null });
    const upsertChain = createUpsertChain({ data: null });

    fromMock
      .mockImplementationOnce(() => existingChain)
      .mockImplementationOnce(() => upsertChain);

    const result = await resolveAppUser("github-id", null as unknown as string);

    expect(result).toBeNull();
    expect(fromMock).toHaveBeenCalledTimes(2);
    expect(existingChain.select).toHaveBeenCalledWith("id");
    expect(upsertChain.upsert).toHaveBeenCalledTimes(1);
  });

  it("upserts new user when githubLogin is provided", async () => {
    const existingChain = createExistingChain({ data: null });
    const upsertChain = createUpsertChain({ data: { id: "new-user-id" } });

    fromMock
      .mockImplementationOnce(() => existingChain)
      .mockImplementationOnce(() => upsertChain);

    const result = await resolveAppUser("github-id", "github-login");

    expect(result).toEqual({ id: "new-user-id" });
    expect(fromMock).toHaveBeenCalledTimes(2);
    expect(existingChain.select).toHaveBeenCalledWith("id");
    expect(upsertChain.upsert).toHaveBeenCalledTimes(1);

    const upsertPayload = upsertChain.upsert.mock.calls[0][0];
    expect(upsertPayload).toEqual(
      expect.objectContaining({
        github_id: "github-id",
        github_login: "github-login",
      })
    );
    expect(typeof upsertPayload.updated_at).toBe("string");
  });

  it("returns existing user data when found", async () => {
    const existingChain = createExistingChain({ data: { id: "existing-id" } });

    fromMock.mockImplementationOnce(() => existingChain);

    const result = await resolveAppUser("github-id", "ignored-login");

    expect(result).toEqual({ id: "existing-id" });
    expect(fromMock).toHaveBeenCalledTimes(1);
  });

  it("handles database errors gracefully", async () => {
    const existingChain = createExistingChain({ data: null, error: new Error("database failure") });
    const upsertChain = createUpsertChain({ data: null, error: new Error("insert failure") });

    fromMock
      .mockImplementationOnce(() => existingChain)
      .mockImplementationOnce(() => upsertChain);

    const result = await resolveAppUser("github-id", "github-login");

    expect(result).toBeNull();
    expect(fromMock).toHaveBeenCalledTimes(2);
  });
});
