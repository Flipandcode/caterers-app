"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ClipboardList, UtensilsCrossed, Wallet, MoreHorizontal, Plus } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/orders", label: "Orders", icon: ClipboardList },
  { href: "/menus", label: "Menus", icon: UtensilsCrossed },
  { href: "/payments", label: "Payments", icon: Wallet },
  { href: "/more", label: "More", icon: MoreHorizontal },
] as const;

/**
 * Fixed bottom nav, per the spec's suggested mobile IA. The floating "+"
 * (New Order) sits above it, centered, so it stays reachable one-handed
 * regardless of which tab is active.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <>
      <Link
        href="/orders/new"
        aria-label="New order"
        className="fixed bottom-[76px] left-1/2 z-30 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-marigold text-white shadow-lg"
      >
        <Plus className="h-6 w-6" />
      </Link>

      <nav className="fixed inset-x-0 bottom-0 z-20 flex h-[68px] border-t border-surface bg-bg/95 backdrop-blur">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname?.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium ${
                isActive ? "text-marigold" : "text-ink/50"
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
