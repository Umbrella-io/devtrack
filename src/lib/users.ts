import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function getUserByUsername(
  username: string
) {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("github_login", username)
    .single();

  if (error) return null;

  return data;
}