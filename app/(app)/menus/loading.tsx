import { ListSkeleton } from "@/components/ui/skeleton";

export default function MenusLoading() {
  return (
    <div className="pb-24">
      <div className="animate-pulse px-4 pb-3 pt-5">
        <div className="h-6 w-1/4 rounded bg-surface" />
        <div className="mt-3 h-10 rounded-lg bg-surface/40" />
      </div>
      <ListSkeleton count={4} />
    </div>
  );
}
