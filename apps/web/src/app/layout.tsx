import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { SITE_URL } from '@/lib/site-url';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Carvio – Quality used cars', template: '%s · Carvio' },
  description: 'Inspected used cars with transparent pricing and a straightforward buying process.',
  openGraph: { siteName: 'Carvio', type: 'website' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col font-sans text-slate-900 antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
          {children}
        </main>
        <footer className="mt-16 border-t border-white/60 bg-white/50 backdrop-blur-xl">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm text-slate-700 sm:grid-cols-3">
            <div>
              <p className="text-base font-bold text-slate-900">
                Carvio<span className="text-gradient">.</span>
              </p>
              <p className="mt-2 max-w-xs">
                Quality used cars with transparent pricing and a straightforward buying process.
              </p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Explore</p>
              <ul className="mt-2 space-y-1.5">
                <li>
                  <Link href="/vehicles" className="hover:text-indigo-700 hover:underline">
                    All cars
                  </Link>
                </li>
                <li>
                  <Link
                    href="/vehicles?fuel=ELECTRIC"
                    className="hover:text-indigo-700 hover:underline"
                  >
                    Electric cars
                  </Link>
                </li>
                <li>
                  <Link href="/admin" className="hover:text-indigo-700 hover:underline">
                    Staff login
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-slate-900">About this site</p>
              <p className="mt-2">
                Carvio is a portfolio project. All vehicles, photos and people are fictional.
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
