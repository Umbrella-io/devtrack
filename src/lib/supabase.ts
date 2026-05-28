import 'server-only';
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const SUPABASE_ADMIN_UNAVAILABLE_MESSAGE =
  "Supabase admin client is unavailable. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.";

type SupabaseAdminClient = SupabaseClient<any, any, any>;

function createUnavailableSupabaseAdmin(): SupabaseAdminClient {
  return {
    from() {
      throw new Error(SUPABASE_ADMIN_UNAVAILABLE_MESSAGE);
    },
  } as unknown as SupabaseAdminClient;
}

// Do not throw here - build-time rendering can touch this module before
// runtime environment variables are present. Guard call sites instead.
export const supabaseAdmin: SupabaseAdminClient =
  supabaseUrl && serviceRoleKey && !supabaseUrl.includes("placeholder")
    ? createClient(supabaseUrl, serviceRoleKey)
    : createUnavailableSupabaseAdmin();

interface User {
  id: string;
  github_id: string;
  github_login: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  is_sponsor?: boolean;
}

/**
 * Look up a user by GitHub username only if their profile is public.
 * Returns the user row if found and is_public is true, otherwise null.
 */
export async function getUserByUsername(
  username: string
): Promise<User | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id,github_id,github_login,is_public,created_at,updated_at,is_sponsor")
      .ilike("github_login", username)
      .eq("is_public", true)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      console.error("Error fetching user:", error);
      return null;
    }

    return data as User;
  } catch (err) {
    console.error("Unexpected error fetching user:", err);
    return null;
  }
}

/**
 * Update the is_public flag for a user.
 */
export async function updateUserPublicFlag(
  userId: string,
  isPublic: boolean
): Promise<User | null> {
  try {
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
  } catch (err) {
    console.error("Unexpected error updating public flag:", err);
    return null;
  }
}


