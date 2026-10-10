import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api, isApiError } from '@/lib/api';
import { vehicleRevalidate } from '@/lib/cache';
import { formatEuro, formatKm, FUEL_LABEL, GEARBOX_LABEL, vehicleTitle } from '@/lib/format';
import { Gallery } from '@/components/gallery';
import { LeadForm } from '@/components/lead-form';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function load(id: string) {
  if (!UUID.test(id)) notFound();
  try {
    return await api.catalog.get(id, vehicleRevalidate());
  } catch (e) {
    if (isApiError(e) && (e.isNotFound || e.status === 400)) notFound();
    throw e; // anything else is a real failure -> error.tsx
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const v = await load((await params).id);
  return {
    title: vehicleTitle(v),
    description: `${vehicleTitle(v)}, ${v.year}, ${formatEuro(v.priceCents)}`,
  };
}

export default async function VehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const v = await load((await params).id);
  const title = vehicleTitle(v);
  const specs: [string, string][] = [
    ['Year', String(v.year)],
    ['Mileage', formatKm(v.mileage)],
    ['Fuel', FUEL_LABEL[v.fuel]],
    ['Gearbox', GEARBOX_LABEL[v.gearbox]],
    ['Colour', v.color],
    ['VIN', v.vin],
  ];

  return (
    <article>
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate-700">
        <Link href="/vehicles" className="hover:underline">
          ← All cars
        </Link>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <Gallery images={v.images} title={title} />
          {v.description && (
            <section aria-labelledby="desc-title" className="mt-8">
              <h2 id="desc-title" className="text-lg font-semibold">
                Description
              </h2>
              <p className="mt-2 whitespace-pre-line text-slate-800">{v.description}</p>
            </section>
          )}
        </div>

        <div className="space-y-6">
          <header>
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="mt-2 text-3xl font-bold text-blue-800">{formatEuro(v.priceCents)}</p>
          </header>

          <section
            aria-labelledby="specs-title"
            className="rounded-lg border border-slate-200 bg-white p-4"
          >
            <h2 id="specs-title" className="sr-only">
              Specifications
            </h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {specs.map(([k, val]) => (
                <div key={k} className="contents">
                  <dt className="text-slate-600">{k}</dt>
                  <dd className="break-all font-medium text-slate-900">{val}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <LeadForm vehicleId={v.id} vehicleTitle={title} />
          </section>
        </div>
      </div>
    </article>
  );
}
