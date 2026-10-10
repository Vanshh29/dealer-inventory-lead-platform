import Link from 'next/link';
import { api, describeError } from '@/lib/api';
import { catalogRevalidate } from '@/lib/cache';
import { VehicleGrid } from '@/components/vehicle-card';
import { CarArt } from '@/components/car-art';
import { ArrowIcon, BoltIcon, KeyIcon, SearchIcon, ShieldIcon, TagIcon } from '@/components/icons';
import { ErrorState, LinkButton, inputClass } from '@/components/ui';

// Rendered per request: the API is not reachable while the Docker image is being built.
export const dynamic = 'force-dynamic';

const QUICK_LINKS = [
  { label: 'Electric', href: '/vehicles?fuel=ELECTRIC' },
  { label: 'Diesel', href: '/vehicles?fuel=DIESEL' },
  { label: 'Automatic', href: '/vehicles?gearbox=AUTOMATIC' },
  { label: 'Under €15,000', href: '/vehicles?priceMax=15000' },
  { label: 'Low mileage', href: '/vehicles?mileageMax=50000' },
];

const PROMISES = [
  {
    icon: ShieldIcon,
    title: 'Inspected cars',
    text: 'Every car is checked before it is listed, and the history is on the page.',
  },
  {
    icon: TagIcon,
    title: 'Honest prices',
    text: 'The price you see is the price you pay. No hidden fees, no haggling games.',
  },
  {
    icon: KeyIcon,
    title: 'Easy test drive',
    text: 'Ask about a car in one minute. We reply and book your test drive.',
  },
];

export default async function HomePage() {
  let latest;
  let error: string | null = null;
  try {
    latest = await api.catalog.search({ limit: 6, sort: 'newest' }, catalogRevalidate());
  } catch (e) {
    error = describeError(e);
  }

  return (
    <div className="space-y-16">
      <section
        aria-labelledby="hero-title"
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 px-6 py-14 text-white shadow-lift sm:px-12 sm:py-20"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-blue-500/30 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl"
        />
        <div className="relative grid items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
          <div className="animate-rise">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-blue-100 ring-1 ring-white/20">
              <BoltIcon className="h-4 w-4" /> New arrivals every week
            </p>
            <h1
              id="hero-title"
              className="mt-5 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl"
            >
              Find the used car
              <span className="block bg-gradient-to-r from-sky-300 to-blue-200 bg-clip-text text-transparent">
                that fits your life.
              </span>
            </h1>
            <p className="mt-4 max-w-lg text-lg text-blue-100">
              Inspected cars with transparent prices. Search by make, model, fuel or any keyword.
            </p>
            <form
              action="/vehicles"
              method="get"
              role="search"
              className="mt-8 flex max-w-xl gap-2 rounded-2xl bg-white p-2 shadow-lift"
            >
              <label htmlFor="home-q" className="sr-only">
                Search cars
              </label>
              <span aria-hidden="true" className="flex items-center pl-3 text-slate-500">
                <SearchIcon className="h-5 w-5" />
              </span>
              <input
                id="home-q"
                name="q"
                type="search"
                placeholder="e.g. golf diesel"
                className={`${inputClass} flex-1 border-transparent shadow-none hover:border-transparent`}
              />
              <button
                type="submit"
                className="rounded-xl bg-gradient-to-b from-blue-600 to-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:from-blue-700 hover:to-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Search
              </button>
            </form>
            <ul className="mt-5 flex flex-wrap gap-2" aria-label="Popular searches">
              {QUICK_LINKS.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="inline-block rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-medium text-white ring-1 ring-white/25 transition hover:bg-white hover:text-blue-900"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div
            aria-hidden="true"
            className="relative hidden animate-rise overflow-hidden rounded-3xl bg-white/10 p-3 ring-1 ring-white/20 backdrop-blur lg:block"
          >
            <div className="aspect-[4/3] overflow-hidden rounded-2xl">
              <CarArt seed="hero" colour="blue" label="" />
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Why buy from us">
        <ul className="grid gap-4 sm:grid-cols-3">
          {PROMISES.map(({ icon: Icon, title, text }) => (
            <li
              key={title}
              className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-card"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <Icon className="h-6 w-6" />
              </span>
              <div>
                <h2 className="font-semibold text-slate-900">{title}</h2>
                <p className="mt-1 text-sm text-slate-700">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="latest-title">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 id="latest-title" className="text-2xl font-bold tracking-tight">
              Latest arrivals
            </h2>
            <p className="mt-1 text-slate-700">Fresh in stock and ready for a test drive.</p>
          </div>
          <Link
            href="/vehicles"
            className="inline-flex items-center gap-1 text-sm font-semibold text-blue-800 hover:underline"
          >
            Browse all cars <ArrowIcon className="h-4 w-4" />
          </Link>
        </div>
        {error && <ErrorState message={error} />}
        {latest && latest.items.length > 0 && <VehicleGrid vehicles={latest.items} />}
        {latest && latest.items.length === 0 && (
          <p className="text-slate-700">No cars are listed right now. Please check back soon.</p>
        )}
      </section>

      <section className="rounded-3xl bg-gradient-to-r from-blue-700 to-indigo-700 px-6 py-10 text-center text-white shadow-lift sm:py-12">
        <h2 className="text-2xl font-bold">Not sure which car suits you?</h2>
        <p className="mx-auto mt-2 max-w-md text-blue-100">
          Browse the full catalog and filter by price, year, mileage, fuel and gearbox.
        </p>
        <div className="mt-6 flex justify-center">
          <LinkButton href="/vehicles" variant="secondary">
            See the full catalog
          </LinkButton>
        </div>
      </section>
    </div>
  );
}
