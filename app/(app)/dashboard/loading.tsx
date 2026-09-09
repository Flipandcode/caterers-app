import { ListSkeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="pb-24">
      <div className="animate-pulse px-4 pb-2 pt-6">
        <div className="h-3 w-1/3 rounded bg-surface" />
        <div className="mt-2 h-6 w-1/2 rounded bg-surface" />
      </div>
      <div className="grid grid-cols-2 gap-3 px-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg border border-surface bg-surface/40" />
        ))}
      </div>
      <ListSkeleton count={2} />
    </div>
  );
}
