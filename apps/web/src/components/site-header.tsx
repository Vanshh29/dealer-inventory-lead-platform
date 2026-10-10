import Link from 'next/link';
import { CarIcon } from './icons';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="group flex items-center gap-2.5 text-lg font-bold tracking-tight">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-900/20 transition group-hover:scale-105"
          >
            <CarIcon className="h-5 w-5" />
          </span>
          <span className="text-slate-900">
            Autohaus <span className="text-blue-700">Demo</span>
          </span>
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 text-sm font-medium">
          <Link
            href="/vehicles"
            className="rounded-lg px-3 py-2 text-slate-800 transition hover:bg-slate-100 hover:text-blue-800"
          >
            Cars
          </Link>
          <Link
            href="/admin"
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-slate-800 shadow-sm transition hover:border-blue-700 hover:text-blue-800"
          >
            Staff login
          </Link>
        </nav>
      </div>
    </header>
  );
}
