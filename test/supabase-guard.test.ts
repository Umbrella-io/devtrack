import { afterEach, describe, expect, it, vi } from "vitest";

describe("supabase admin guard", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("throws a clear configuration error instead of exposing a null client", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    const { supabaseAdmin, SUPABASE_ADMIN_UNAVAILABLE_MESSAGE } = await import("@/lib/supabase");

    expect(() => supabaseAdmin.from("users")).toThrow(SUPABASE_ADMIN_UNAVAILABLE_MESSAGE);
  });

  it("lets helper functions fail safely when the admin client is unavailable", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    const { getUserByUsername } = await import("@/lib/supabase");
    const result = await getUserByUsername("octocat");

    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});
