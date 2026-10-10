import Link from 'next/link';

export function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold text-slate-900">
          Autohaus <span className="text-blue-700">Demo</span>
        </Link>
        <nav aria-label="Main" className="flex items-center gap-5 text-sm font-medium">
          <Link href="/vehicles" className="text-slate-800 hover:text-blue-700">
            Cars
          </Link>
          <Link href="/admin" className="text-slate-600 hover:text-blue-700">
            Staff login
          </Link>
        </nav>
      </div>
    </header>
  );
}
