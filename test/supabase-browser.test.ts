import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.resetModules();

describe("supabase-browser env validation", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it("isBrowserClientAvailable returns true when both env vars are valid", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc123.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.real-anon-key";
    const { isBrowserClientAvailable } = await import("@/lib/supabase-browser");
    expect(isBrowserClientAvailable).toBe(true);
  });

  it("isBrowserClientAvailable returns false when URL contains placeholder", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://placeholder.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.real-anon-key";
    const { isBrowserClientAvailable } = await import("@/lib/supabase-browser");
    expect(isBrowserClientAvailable).toBe(false);
  });

  it("isBrowserClientAvailable returns false when anon key contains placeholder", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc123.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "placeholder-key";
    const { isBrowserClientAvailable } = await import("@/lib/supabase-browser");
    expect(isBrowserClientAvailable).toBe(false);
  });

  it("isBrowserClientAvailable returns false when URL is missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.real-anon-key";
    const { isBrowserClientAvailable } = await import("@/lib/supabase-browser");
    expect(isBrowserClientAvailable).toBe(false);
  });

  it("isBrowserClientAvailable returns false when anon key is missing", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc123.supabase.co";
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const { isBrowserClientAvailable } = await import("@/lib/supabase-browser");
    expect(isBrowserClientAvailable).toBe(false);
  });

  it("isBrowserClientAvailable returns false when URL is empty string", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.real-anon-key";
    const { isBrowserClientAvailable } = await import("@/lib/supabase-browser");
    expect(isBrowserClientAvailable).toBe(false);
  });

  it("isBrowserClientAvailable returns false when anon key is empty string", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc123.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "";
    const { isBrowserClientAvailable } = await import("@/lib/supabase-browser");
    expect(isBrowserClientAvailable).toBe(false);
  });
});
