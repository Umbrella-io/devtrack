import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
}

if (!serviceRoleKey) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
}

// Server-side only — use in API routes, never import in client components.
// Service role bypasses RLS; auth is enforced by getServerSession checks.
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

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
export async function getUserByUsername(
  username: string
): Promise<User | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id,github_id,github_login,is_public,created_at,updated_at")
      .eq("github_login", username)
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
