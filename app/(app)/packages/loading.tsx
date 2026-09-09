import { ListSkeleton } from "@/components/ui/skeleton";

export default function PackagesLoading() {
  return (
    <div className="pb-24">
      <div className="animate-pulse px-4 pb-3 pt-5">
        <div className="h-6 w-1/3 rounded bg-surface" />
      </div>
      <ListSkeleton count={3} />
    </div>
  );
}
