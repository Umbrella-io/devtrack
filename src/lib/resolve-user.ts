import { supabaseAdmin } from "@/lib/supabase";

export interface AppUser {
  id: string;
}

export async function resolveAppUser(
  githubId: string,
  githubLogin?: string
): Promise<AppUser | null> {
  try {
    // Step 1: Check if user already exists
    const { data: existing, error: queryError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("github_id", githubId)
      .single();

    // User found - return immediately
    if (existing) {
      return existing;
    }

    // Step 2: Handle query errors
    if (queryError) {
      // PGRST116 = no rows found (expected when user is new)
      if (queryError.code !== "PGRST116") {
        console.error("Error querying user (not PGRST116):", {
          githubId,
          errorCode: queryError.code,
          errorMessage: queryError.message,
          errorDetails: queryError.details,
        });
        return null;
      }
    }

    // Step 3: User doesn't exist, try to create via upsert
    const { data: upserted, error: upsertError } = await supabaseAdmin
      .from("users")
      .upsert(
        {
          github_id: githubId,
          github_login: githubLogin,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "github_id" }
      )
      .select("id")
      .single();

    if (upsertError) {
      console.error("Error upserting user in resolveAppUser:", {
        githubId,
        githubLogin,
        errorCode: upsertError.code,
        errorMessage: upsertError.message,
        errorDetails: upsertError.details,
        hint: upsertError.hint,
      });
      return null;
    }

    if (!upserted) {
      console.error("Upsert succeeded but returned no data:", {
        githubId,
        githubLogin,
      });
      return null;
    }

    return upserted;
  } catch (error) {
    console.error("Unexpected error in resolveAppUser:", {
      githubId,
      error,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    return null;
  }
}

