import { supabaseAdmin } from "@/lib/supabase";

export interface AppUser {
  id: string;
}

export async function resolveAppUser(
  githubId: string,
  githubLogin?: string
): Promise<AppUser | null> {
  const { data: existing } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("github_id", githubId)
    .single();

  if (existing) return existing;

  const { data: upserted } = await supabaseAdmin
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
    .single();

  return upserted ?? null;
}
