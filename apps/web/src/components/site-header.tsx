import Link from 'next/link';
import { CarIcon } from './icons';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/60 bg-white/60 shadow-[0_8px_30px_-12px_rgb(40_50_180/0.25)] backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5 text-lg font-bold tracking-tight">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white shadow-glow transition duration-300 group-hover:rotate-6 group-hover:scale-110"
          >
            <CarIcon className="h-5 w-5" />
          </span>
          <span className="text-slate-900">
            Carvio
          </span>
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 text-sm font-medium">
          <Link
            href="/vehicles"
            className="rounded-xl px-3.5 py-2 text-slate-800 transition hover:bg-white/80 hover:text-indigo-700"
          >
            Cars
          </Link>
          <Link
            href="/admin"
            className="glass rounded-xl px-3.5 py-2 text-slate-800 transition hover:-translate-y-px hover:bg-white hover:text-indigo-700"
          >
            Staff login
          </Link>
        </nav>
      </div>
    </header>
  );
}
