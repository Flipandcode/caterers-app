export default function OrderDetailLoading() {
  return (
    <div className="animate-pulse pb-24">
      <div className="border-b border-surface px-4 pb-4 pt-5">
        <div className="h-3 w-1/4 rounded bg-surface" />
        <div className="mt-2 h-6 w-1/2 rounded bg-surface" />
        <div className="mt-1 h-3 w-1/3 rounded bg-surface" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="border-b border-surface px-4 py-4">
          <div className="h-3 w-1/4 rounded bg-surface" />
          <div className="mt-3 h-3 w-full rounded bg-surface/60" />
          <div className="mt-2 h-3 w-2/3 rounded bg-surface/60" />
        </div>
      ))}
    </div>
  );
}
