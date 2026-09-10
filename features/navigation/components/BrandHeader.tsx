interface BrandHeaderProps {
  displayName: string;
  logoUrl: string | null;
}

/**
 * Slim, persistent identity strip shown above every tab screen — the "this
 * is YOUR business's app" moment, not just a one-off greeting on the
 * dashboard. Falls back to a monogram avatar (first letter, marigold
 * circle) for businesses that haven't uploaded a logo yet, so the app still
 * feels personalized on day one rather than generic.
 */
export function BrandHeader({ displayName, logoUrl }: BrandHeaderProps) {
  const initial = displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="flex items-center gap-2.5 border-b border-surface bg-bg px-4 py-2.5 shadow-warm-sm">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL, not a local asset
        <img
          src={logoUrl}
          alt={`${displayName} logo`}
          className="h-8 w-8 shrink-0 rounded-full border border-surface object-cover"
        />
      ) : (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-marigold font-display text-sm font-bold text-white shadow-marigold">
          {initial}
        </div>
      )}
      <p className="truncate font-display text-sm font-medium text-ink/80">{displayName}</p>
    </div>
  );
}
