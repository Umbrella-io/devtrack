import { createClient } from "@supabase/supabase-js";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Lazy-initialize the Supabase admin client to avoid crashing at module import
// time when env vars are not present (e.g., during Next.js static builds).
let _supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (_supabaseClient) return _supabaseClient;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. See DEVELOPMENT.md for setup."
    );
  }
  _supabaseClient = createClient(supabaseUrl, serviceRoleKey);
  return _supabaseClient;
}

// Export a Proxy that forwards calls to the real client once initialized.
// This preserves existing import sites that expect `supabaseAdmin` to be the
// Supabase client while deferring the env-var error until the first use.
export const supabaseAdmin: any = new Proxy(
  {},
  {
    get(_target, prop) {
      const client = getSupabaseClient();
      // @ts-ignore
      const value = (client as any)[prop];
      if (typeof value === "function") return value.bind(client);
      return value;
    },
  }
);

interface User {
  id: string;
  github_id: string;
  github_login: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Look up a user by GitHub username only if their profile is public.
 * Returns the user row if found and is_public is true, otherwise null.
 */
export async function getUserByUsername(username: string): Promise<User | null> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id,github_id,github_login,is_public,created_at,updated_at")
    .eq("github_login", username)
    .eq("is_public", true)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No rows found
      return null;
    }
    console.error("Error fetching user:", error);
    return null;
  }

  return data as User;
}

/**
 * Update the is_public flag for a user.
 */
export async function updateUserPublicFlag(
  userId: string,
  isPublic: boolean
): Promise<User | null> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .update({ is_public: isPublic })
    .eq("id", userId)
    .select("id,github_id,github_login,is_public,created_at,updated_at")
    .single();

  if (error) {
    console.error("Error updating user public flag:", error);
    return null;
  }

  return data as User;
}
