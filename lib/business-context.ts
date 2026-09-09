import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Resolves which business the signed-in user is currently acting as.
 * MVP assumption: a user belongs to exactly one active business (owner
 * flow). Multi-business support (an owner running several catering
 * brands, or a staff member on multiple teams) can extend this to read
 * a selected-business cookie set by a switcher UI — the underlying
 * business_members table already supports many-to-many.
 *
 * Uses getSession() rather than getUser(): middleware already called
 * getUser() this request (which hits Supabase's Auth server to verify and
 * refresh the token), so re-verifying again here would be a second,
 * redundant network round-trip on every single page navigation. getSession()
 * just reads the already-verified session from the request's cookies —
 * no network call.
 */
export async function getActiveBusinessId(): Promise<string> {
  const supabase = createServerSupabaseClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) redirect("/login");

  const { data: membership } = await supabase
    .from("business_members")
    .select("business_id")
    .eq("user_id", session.user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership) redirect("/onboarding");

  return membership.business_id;
}
