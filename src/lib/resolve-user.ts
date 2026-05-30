import { supabaseAdmin } from "@/lib/supabase";

export interface AppUser {
  id: string;
}

export async function resolveAppUser(
  githubId: string,
  githubLogin?: string
): Promise<AppUser | null> {
  try {
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("github_id", githubId)
      .single();

    if (existingError && existingError.code !== "PGRST116") {
      console.error("Error fetching existing user:", existingError);
      return null;
    }

    if (existing) {
      return existing;
    }

    if (!githubLogin) {
      console.error("Missing githubLogin");
      return null;
    }

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
      console.error("Error upserting user:", upsertError);
      return null;
    }

    return upserted ?? null;
  } catch (error) {
    console.error("resolveAppUser failed:", error);
    return null;
  }
}