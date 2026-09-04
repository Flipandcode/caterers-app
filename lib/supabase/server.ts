import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client for Server Components / Server Actions.
 * Uses the ANON key + the signed-in user's cookies, so every query still
 * goes through RLS as that user — this is NOT a service-role client.
 * Use lib/supabase/admin.ts (service-role, server-only, no cookies) for
 * privileged jobs like the cron reminder dispatcher.
 */
export function createServerSupabaseClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // called from a Server Component with no mutation access — safe to ignore,
            // middleware refreshes the session cookie on the next request.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // see note above
          }
        },
      },
    }
  );
}
