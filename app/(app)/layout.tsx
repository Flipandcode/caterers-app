import type { ReactNode } from "react";
import { BottomNav } from "@/features/navigation/components/BottomNav";

/**
 * Shared shell for every signed-in screen. Note: some screens (Menus,
 * Package builder) render their own screen-specific floating action button
 * alongside the global "New Order" FAB here — that's intentional (a global
 * primary action plus a contextual one), but worth revisiting visually if
 * two circular buttons ever appear stacked on the same screen.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg">
      {children}
      <BottomNav />
    </div>
  );
}
