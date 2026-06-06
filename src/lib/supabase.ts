/**
 * @deprecated Import directly from the appropriate module instead:
 *
 *   - Server-only (admin/service role):  `@/lib/supabase-admin`
 *   - Browser-safe (anon key):           `@/lib/supabase-browser`
 *
 * This re-export barrel exists for backward compatibility while call sites
 * are migrated. It will be removed in a future release.
 */

export {
  supabaseAdmin,
  isSupabaseAdminAvailable,
  SUPABASE_ADMIN_UNAVAILABLE_MESSAGE,
  getUserByUsername,
  getUserByGithubId,
  updateUserPublicFlag,
} from "@/lib/supabase-admin";

export {
  supabaseBrowser,
  isBrowserClientAvailable,
  BROWSER_CLIENT_UNAVAILABLE_MESSAGE,
} from "@/lib/supabase-browser";