import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.resetModules();

describe("supabase-admin env validation", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it("isSupabaseAdminAvailable returns true when both env vars are valid", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc123.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.real-signature";
    const { isSupabaseAdminAvailable } = await import("@/lib/supabase-admin");
    expect(isSupabaseAdminAvailable).toBe(true);
  });

  it("isSupabaseAdminAvailable returns false when URL contains placeholder", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://placeholder.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.real-signature";
    const { isSupabaseAdminAvailable } = await import("@/lib/supabase-admin");
    expect(isSupabaseAdminAvailable).toBe(false);
  });

  it("isSupabaseAdminAvailable returns false when key contains placeholder", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc123.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "placeholder-key";
    const { isSupabaseAdminAvailable } = await import("@/lib/supabase-admin");
    expect(isSupabaseAdminAvailable).toBe(false);
  });

  it("isSupabaseAdminAvailable returns false when URL is missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.real-signature";
    const { isSupabaseAdminAvailable } = await import("@/lib/supabase-admin");
    expect(isSupabaseAdminAvailable).toBe(false);
  });

  it("isSupabaseAdminAvailable returns false when key is missing", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc123.supabase.co";
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const { isSupabaseAdminAvailable } = await import("@/lib/supabase-admin");
    expect(isSupabaseAdminAvailable).toBe(false);
  });

  it("isSupabaseAdminAvailable returns false when URL is empty string", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.real-signature";
    const { isSupabaseAdminAvailable } = await import("@/lib/supabase-admin");
    expect(isSupabaseAdminAvailable).toBe(false);
  });

  it("isSupabaseAdminAvailable returns false when key is empty string", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc123.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "";
    const { isSupabaseAdminAvailable } = await import("@/lib/supabase-admin");
    expect(isSupabaseAdminAvailable).toBe(false);
  });
});
