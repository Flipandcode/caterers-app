import type { ReactNode } from "react";
import { BottomNav } from "@/features/navigation/components/BottomNav";
import { BrandHeader } from "@/features/navigation/components/BrandHeader";
import { getActiveBusinessId } from "@/lib/business-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Shared shell for every signed-in screen. Note: some screens (Menus,
 * Package builder) render their own screen-specific floating action button
 * alongside the global "New Order" FAB here — that's intentional (a global
 * primary action plus a contextual one), but worth revisiting visually if
 * two circular buttons ever appear stacked on the same screen.
 *
 * This layout's data fetch (business name/logo) runs once when a signed-in
 * user first lands in this route group, not on every tab click — the App
 * Router preserves shared layouts across sibling navigations rather than
 * re-rendering them from scratch each time.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const businessId = await getActiveBusinessId();
  const supabase = createServerSupabaseClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("name, display_name, logo_url")
    .eq("id", businessId)
    .single();

  return (
    <div className="min-h-screen bg-bg">
      <BrandHeader
        displayName={business?.display_name ?? business?.name ?? "Your business"}
        logoUrl={business?.logo_url ?? null}
      />
      {children}
      <BottomNav />
    </div>
  );
}
