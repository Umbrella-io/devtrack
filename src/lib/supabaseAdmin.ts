import "server-only";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey
);

export async function getUserByUsername(
  username: string
) {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("github_login", username)
    .single();

  if (error) {
    return null;
  }

  return data;
}