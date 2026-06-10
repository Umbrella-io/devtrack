import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { isConfiguredSupabaseKey, isValidSupabaseUrl } from "@/lib/supabase-env";

/**
 * Browser-safe Supabase client using the public anon key.
 *
 * This file is safe to import in both client and server components.
 * It uses NEXT_PUBLIC_* env vars which are intentionally exposed to the browser.
 * RLS policies are enforced for all queries made through this client.
 */

function getValidatedBrowserEnv(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!isValidSupabaseUrl(url) || !isConfiguredSupabaseKey(anonKey)) {
    return null;
  }

  return { url: url.trim(), anonKey: anonKey.trim() };
}

export const isBrowserClientAvailable = !!getValidatedBrowserEnv();

export const BROWSER_CLIENT_UNAVAILABLE_MESSAGE =
  "Supabase browser client is unavailable. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.";

// eslint-disable-next-line
type SupabaseBrowserClient = SupabaseClient<any, any, any>;

function createUnavailableBrowserClient(): SupabaseBrowserClient {
  return {
    from() {
      throw new Error(BROWSER_CLIENT_UNAVAILABLE_MESSAGE);
    },
  } as unknown as SupabaseBrowserClient;
}

const env = getValidatedBrowserEnv();

export const supabaseBrowser: SupabaseBrowserClient = env
  ? createClient(env.url, env.anonKey)
  : createUnavailableBrowserClient();
