import Link from "next/link";
import { signOutAction } from "@/server/actions/auth";

const LINKS = [
  { href: "/packages", label: "Packages" },
  { href: "/menus", label: "Menu catalogue" },
];

export default function MorePage() {
  return (
    <div className="px-4 pb-24 pt-6">
      <h1 className="mb-4 font-display text-2xl">More</h1>

      <div className="flex flex-col gap-1 rounded-lg border border-surface">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="border-b border-surface p-4 last:border-0 hover:bg-surface/40"
          >
            {link.label}
          </Link>
        ))}
      </div>

      <p className="mt-4 text-sm text-ink/50">
        Settings (business profile, branding, payment details, terms, notifications) is coming in a later
        phase.
      </p>

      <form action={signOutAction} className="mt-6">
        <button type="submit" className="text-sm font-medium text-tamarind">
          Log out
        </button>
      </form>
    </div>
  );
}
