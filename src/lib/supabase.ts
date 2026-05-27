import 'server-only';

export {
  isSupabaseAdminAvailable,
  SUPABASE_ADMIN_UNAVAILABLE_MESSAGE,
  supabaseAdmin,
  getUserByUsername,
  getUserByGithubId,
  updateUserPublicFlag,
  type User,
} from "@/lib/supabase-admin";

export {
  supabaseBrowser,
  isBrowserClientAvailable,
  BROWSER_CLIENT_UNAVAILABLE_MESSAGE,
} from "@/lib/supabase-browser";

// Re-export all admin utilities and types from the dedicated admin module
export {
  isSupabaseAdminAvailable,
  SUPABASE_ADMIN_UNAVAILABLE_MESSAGE,
  supabaseAdmin,
  getUserByUsername,
  getUserByGithubId,
  updateUserPublicFlag,
  type User,
} from "@/lib/supabase-admin";

// Re-export browser utilities
export {
  supabaseBrowser,
  isBrowserClientAvailable,
  BROWSER_CLIENT_UNAVAILABLE_MESSAGE,
} from "@/lib/supabase-browser";
