import { afterEach, describe, expect, it, vi } from "vitest";

describe("supabase admin guard", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("throws a clear configuration error instead of exposing a null client", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    const { supabaseAdmin, SUPABASE_ADMIN_UNAVAILABLE_MESSAGE } = await import(
      "@/lib/supabase-admin"
    );

    expect(() => supabaseAdmin.from("users")).toThrow(
      SUPABASE_ADMIN_UNAVAILABLE_MESSAGE
    );
  });

  it("lets helper functions fail safely when the admin client is unavailable", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    const { getUserByUsername } = await import("@/lib/supabase-admin");
    const result = await getUserByUsername("octocat");

    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  it("treats placeholder values as missing configuration", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SUPABASE_URL",
      "https://your-project-ref.supabase.co"
    );
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "your_supabase_service_role_key");

    const { isSupabaseAdminAvailable } = await import("@/lib/supabase-admin");

    expect(isSupabaseAdminAvailable).toBe(false);
  });

  it("marks admin as available when both env vars are real values", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abc123.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.real");

    const { isSupabaseAdminAvailable } = await import("@/lib/supabase-admin");

    expect(isSupabaseAdminAvailable).toBe(true);
  });
});

describe("supabase browser client guard", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("throws a clear error when browser env vars are missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

    const { supabaseBrowser, BROWSER_CLIENT_UNAVAILABLE_MESSAGE } =
      await import("@/lib/supabase-browser");

    expect(() => supabaseBrowser.from("users")).toThrow(
      BROWSER_CLIENT_UNAVAILABLE_MESSAGE
    );
  });

  it("treats placeholder anon key as missing configuration", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abc123.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "your_supabase_anon_key");

    const { isBrowserClientAvailable } = await import("@/lib/supabase-browser");

    expect(isBrowserClientAvailable).toBe(false);
  });
});