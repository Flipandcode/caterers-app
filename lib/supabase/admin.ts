import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client — bypasses RLS entirely. Import ONLY from trusted
 * server-only code that has no user-provided business_id it hasn't already
 * verified (e.g. the cron reminder dispatcher, which iterates all
 * businesses by design). Never import this from a Server Action that
 * handles a single user's request — use lib/supabase/server.ts there so
 * RLS stays the enforcement boundary.
 */
export function createAdminSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
