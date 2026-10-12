import type { Metadata } from 'next';
import { api, describeError } from '@/lib/api';
import { catalogRevalidate, facetsRevalidate } from '@/lib/cache';
import { catalogHref, parseCatalogSearch, type RawSearchParams } from '@/lib/catalog-params';
import { ActiveFilters, CatalogFilters } from '@/components/catalog-filters';
import { FilterDrawer } from '@/components/filter-drawer';
import { VehicleGrid } from '@/components/vehicle-card';
import { EmptyState, ErrorState, LinkButton, Pagination } from '@/components/ui';

export const metadata: Metadata = { title: 'Cars' };

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const { params, state, page } = parseCatalogSearch(await searchParams);

  // Facets are a nicety: if they fail the filters still work as plain inputs.
  const [result, facets] = await Promise.allSettled([
    api.catalog.search(params, catalogRevalidate()),
    api.catalog.facets(facetsRevalidate()),
  ]);

  return (
    <div className="lg:grid lg:grid-cols-[18rem_1fr] lg:gap-8">
      <FilterDrawer activeCount={Object.keys(state).filter((k) => k !== 'sort').length}>
        <CatalogFilters
          facets={facets.status === 'fulfilled' ? facets.value : null}
          state={state}
        />
      </FilterDrawer>

      <section aria-labelledby="catalog-title">
        <h1 id="catalog-title" className="text-3xl font-bold tracking-tight">
          Cars
        </h1>

        {result.status === 'rejected' && (
          <div className="mt-4">
            <ErrorState message={describeError(result.reason)} />
            <div className="mt-3">
              <LinkButton href={catalogHref(state, page)} variant="secondary">
                Reload
              </LinkButton>
            </div>
          </div>
        )}

        {result.status === 'fulfilled' && (
          <>
            <p className="mt-1 text-slate-700" aria-live="polite">
              {result.value.total} {result.value.total === 1 ? 'car' : 'cars'} found
            </p>
            <ActiveFilters state={state} />
            {result.value.items.length === 0 ? (
              <div className="mt-6">
                <EmptyState title="No cars match your search">
                  Try removing a filter or a keyword.
                  <div className="mt-4">
                    <LinkButton href="/vehicles" variant="secondary">
                      Clear all filters
                    </LinkButton>
                  </div>
                </EmptyState>
              </div>
            ) : (
              <div className="mt-4">
                <h2 className="sr-only">Results</h2>
                <VehicleGrid vehicles={result.value.items} />
                <Pagination
                  page={result.value.page}
                  limit={result.value.limit}
                  total={result.value.total}
                  hrefFor={(p) => catalogHref(state, p)}
                />
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
