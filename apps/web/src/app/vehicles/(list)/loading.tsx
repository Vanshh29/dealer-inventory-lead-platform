function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/80 bg-white/90 shadow-card">
      <div className="aspect-[4/3] animate-pulse bg-slate-200" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-4/5 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-3/5 animate-pulse rounded bg-slate-200" />
        <div className="h-7 w-2/5 animate-pulse rounded bg-slate-200" />
        <div className="flex gap-1.5 border-t border-slate-200/70 pt-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-6 w-14 animate-pulse rounded-md bg-slate-200" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Loading cars"
      className="lg:grid lg:grid-cols-[18rem_1fr] lg:gap-8"
    >
      <div className="hidden h-96 animate-pulse rounded-2xl bg-slate-200 lg:block" />
      <div>
        <div className="h-9 w-32 animate-pulse rounded bg-slate-200" />
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 6 }, (_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
