import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api, isApiError } from '@/lib/api';
import { vehicleRevalidate } from '@/lib/cache';
import { formatEuro, formatKm, FUEL_LABEL, GEARBOX_LABEL, vehicleTitle } from '@/lib/format';
import { Gallery } from '@/components/gallery';
import { LeadForm } from '@/components/lead-form';
import {
  CalendarIcon,
  GaugeIcon,
  FuelIcon,
  GearIcon,
  PaletteIcon,
  ChevronLeftIcon,
} from '@/components/icons';

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
  const specs = [
    { label: 'Year', value: String(v.year), icon: CalendarIcon },
    { label: 'Mileage', value: formatKm(v.mileage), icon: GaugeIcon },
    { label: 'Fuel', value: FUEL_LABEL[v.fuel], icon: FuelIcon },
    { label: 'Gearbox', value: GEARBOX_LABEL[v.gearbox], icon: GearIcon },
    { label: 'Colour', value: v.color, icon: PaletteIcon },
  ];

  return (
    <article>
      <nav aria-label="Breadcrumb" className="mb-5 text-sm font-medium text-slate-700">
        <Link href="/vehicles" className="inline-flex items-center gap-1 hover:text-blue-800">
          <ChevronLeftIcon className="h-4 w-4" /> All cars
        </Link>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:gap-8">
        <div className="lg:col-start-1 lg:row-start-1">
          <Gallery images={v.images} title={title} vehicle={v} />
        </div>
        <div className="space-y-5 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
          <header className="glass rounded-2xl p-6">
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            <p className="mt-3 text-4xl font-extrabold tracking-tight text-blue-800">
              {formatEuro(v.priceCents)}
            </p>
            <p className="mt-1 text-sm text-slate-600">Final price, including VAT</p>
          </header>

          <section aria-labelledby="specs-title">
            <h2 id="specs-title" className="sr-only">
              Specifications
            </h2>
            <dl className="grid grid-cols-2 gap-3">
              {specs.map(({ label, value, icon: Icon }) => (
                <div key={label} className="glass rounded-2xl p-3.5">
                  <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-600">
                    <Icon className="h-4 w-4 text-blue-700" /> {label}
                  </dt>
                  <dd className="mt-1 font-semibold text-slate-900">{value}</dd>
                </div>
              ))}
              <div className="col-span-2 glass rounded-2xl p-3.5">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-600">VIN</dt>
                <dd className="mt-1 break-all font-mono text-sm font-medium text-slate-900">
                  {v.vin}
                </dd>
              </div>
            </dl>
          </section>

          <section className="glass rounded-2xl p-6">
            <LeadForm vehicleId={v.id} vehicleTitle={title} />
          </section>
        </div>
        {v.description && (
          <section
            aria-labelledby="desc-title"
            className="glass rounded-2xl p-6 lg:col-start-1 lg:row-start-2"
          >
            <h2 id="desc-title" className="text-lg font-semibold">
              Description
            </h2>
            <p className="mt-2 whitespace-pre-line text-slate-800">{v.description}</p>
          </section>
        )}
      </div>
    </article>
  );
}
