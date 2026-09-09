export function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-lg border border-surface p-4">
      <div className="h-4 w-1/3 rounded bg-surface" />
      <div className="mt-2 h-3 w-1/2 rounded bg-surface" />
      <div className="mt-3 h-3 w-2/3 rounded bg-surface" />
    </div>
  );
}

export function ListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3 px-4 pt-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
