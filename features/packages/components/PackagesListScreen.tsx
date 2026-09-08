"use client";

import { useState } from "react";
import Link from "next/link";
import { Package } from "@/types/domain";
import { formatPaise } from "@/lib/money";
import { archivePackageAction, duplicatePackageAction } from "@/server/actions/packages";
import { MoreVertical } from "lucide-react";

interface PackagesListScreenProps {
  initialPackages: Package[];
}

export function PackagesListScreen({ initialPackages }: PackagesListScreenProps) {
  const [packages, setPackages] = useState(initialPackages);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleArchive(id: string) {
    setBusyId(id);
    setOpenMenuId(null);
    try {
      await archivePackageAction(id);
      setPackages((prev) => prev.filter((p) => p.id !== id));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDuplicate(id: string) {
    setBusyId(id);
    setOpenMenuId(null);
    try {
      await duplicatePackageAction(id);
      // Simplest correct refresh: reload from the server so the duplicate's
      // full composition (rules/preselected items) shows up immediately.
      window.location.reload();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="pb-24">
      <header className="sticky top-0 z-10 bg-bg/95 px-4 pb-3 pt-5 backdrop-blur">
        <div className="flex items-baseline justify-between">
          <h1 className="font-display text-2xl">Packages</h1>
          <Link href="/packages/new" className="text-sm font-medium text-marigold">
            + New package
          </Link>
        </div>
      </header>

      <div className="flex flex-col gap-3 px-4">
        {packages.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="font-display text-lg">No packages created yet.</p>
            <p className="text-sm text-ink/60">
              Build a reusable package once, then select it in seconds on every order.
            </p>
            <Link
              href="/packages/new"
              className="mt-2 rounded-lg bg-marigold px-5 py-2.5 text-sm font-medium text-white"
            >
              Create your first package
            </Link>
          </div>
        ) : (
          packages.map((pkg) => (
            <div key={pkg.id} className="relative rounded-lg border border-surface p-4">
              <Link href={`/packages/${pkg.id}`} className="block pr-8">
                <div className="flex items-baseline justify-between">
                  <p className="font-display text-lg">{pkg.name}</p>
                  <p className="font-display text-lg">{formatPaise(pkg.basePricePerPlatePaise)} / plate</p>
                </div>
                {pkg.description && <p className="mt-1 text-sm text-ink/60">{pkg.description}</p>}
                <p className="mt-2 text-xs uppercase tracking-wide text-ink/40">
                  {pkg.foodType.replace("_", "-")} · Min {pkg.minGuestCount} guests
                </p>
              </Link>

              <button
                onClick={() => setOpenMenuId(openMenuId === pkg.id ? null : pkg.id)}
                aria-label="Package actions"
                className="absolute right-3 top-4 text-ink/40"
              >
                <MoreVertical className="h-5 w-5" />
              </button>

              {openMenuId === pkg.id && (
                <div className="absolute right-3 top-11 z-10 w-40 rounded-lg border border-surface bg-bg shadow-lg">
                  <Link
                    href={`/packages/${pkg.id}`}
                    className="block px-4 py-2.5 text-sm hover:bg-surface/40"
                    onClick={() => setOpenMenuId(null)}
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDuplicate(pkg.id)}
                    disabled={busyId === pkg.id}
                    className="block w-full px-4 py-2.5 text-left text-sm hover:bg-surface/40"
                  >
                    Duplicate
                  </button>
                  <button
                    onClick={() => handleArchive(pkg.id)}
                    disabled={busyId === pkg.id}
                    className="block w-full px-4 py-2.5 text-left text-sm text-tamarind hover:bg-surface/40"
                  >
                    Archive
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
