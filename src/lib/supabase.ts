import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Server-side only — use in API routes, never import in client components.
// Service role bypasses RLS; auth is enforced by getServerSession checks.
// Keep initialization guarded so missing env vars do not crash route modules.
export const supabaseAdmin =
	supabaseUrl && serviceRoleKey
		? createClient(supabaseUrl, serviceRoleKey)
		: null;
