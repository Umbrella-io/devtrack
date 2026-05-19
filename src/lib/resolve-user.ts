import { supabaseAdmin } from "@/lib/supabase";

export interface AppUser {
  id: string;
}

export async function resolveAppUser(
  githubId: string,
  githubLogin?: string
): Promise<AppUser | null> {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("github_id", githubId)
    .maybeSingle();

  if (existingError) {
    console.error("Failed to resolve existing user", {
      githubId,
      error: existingError,
    });
    return null;
  }

  if (existing) return existing;

  const { data: upserted, error: upsertError } = await supabaseAdmin
    .from("users")
    .upsert(
      {
        github_id: githubId,
        github_login: githubLogin,
        updated_at: new Date().toISOString()
      },
      { onConflict: "github_id" }
    )
    .select("id")
    .maybeSingle();

  if (upsertError) {
    console.error("Failed to upsert user", {
      githubId,
      githubLogin,
      error: upsertError,
    });
    return null;
  }

  return upserted ?? null;
}
