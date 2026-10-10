export default function Loading() {
  return (
    <div role="status" aria-label="Loading cars" className="grid gap-8 lg:grid-cols-[18rem_1fr]">
      <div className="h-96 animate-pulse rounded-lg bg-slate-200" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-64 animate-pulse rounded-lg bg-slate-200" />
        ))}
      </div>
    </div>
  );
}
