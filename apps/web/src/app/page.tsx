import Link from 'next/link';
import { api, describeError } from '@/lib/api';
import { catalogRevalidate } from '@/lib/cache';
import { VehicleGrid } from '@/components/vehicle-card';
import { ErrorState, LinkButton, inputClass, buttonClass } from '@/components/ui';

// Rendered per request: the API is not reachable while the Docker image is being built.
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let latest;
  let error: string | null = null;
  try {
    latest = await api.catalog.search({ limit: 6, sort: 'newest' }, catalogRevalidate());
  } catch (e) {
    error = describeError(e);
  }

  return (
    <div className="space-y-12">
      <section
        aria-labelledby="hero-title"
        className="rounded-2xl bg-blue-900 px-6 py-12 text-white"
      >
        <h1 id="hero-title" className="text-3xl font-bold sm:text-4xl">
          Find your next car
        </h1>
        <p className="mt-2 max-w-xl text-blue-100">
          Inspected used cars with transparent prices. Search by make, model, fuel or any keyword.
        </p>
        <form action="/vehicles" method="get" role="search" className="mt-6 flex max-w-xl gap-2">
          <label htmlFor="home-q" className="sr-only">
            Search cars
          </label>
          <input
            id="home-q"
            name="q"
            type="search"
            placeholder="e.g. golf diesel"
            className={`${inputClass} flex-1`}
          />
          <button type="submit" className={buttonClass('secondary')}>
            Search
          </button>
        </form>
      </section>

      <section aria-labelledby="latest-title">
        <div className="mb-4 flex items-end justify-between">
          <h2 id="latest-title" className="text-xl font-semibold">
            Latest arrivals
          </h2>
          <Link href="/vehicles" className="text-sm font-medium text-blue-800 hover:underline">
            Browse all cars →
          </Link>
        </div>
        {error && <ErrorState message={error} />}
        {latest && latest.items.length > 0 && <VehicleGrid vehicles={latest.items} />}
        {latest && latest.items.length === 0 && (
          <p className="text-slate-700">No cars are listed right now. Please check back soon.</p>
        )}
      </section>

      <div>
        <LinkButton href="/vehicles">See the full catalog</LinkButton>
      </div>
    </div>
  );
}
