'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useSession } from '@/lib/session';
import { CarIcon, GridIcon, InboxIcon } from './icons';
import { Badge, Button, ErrorState, Spinner } from './ui';

const NAV = [
  { href: '/admin', label: 'Dashboard', exact: true, icon: GridIcon },
  { href: '/admin/leads', label: 'Leads', icon: InboxIcon },
  { href: '/admin/vehicles', label: 'Vehicles', icon: CarIcon },
];

/**
 * Gate for the whole back office. This only decides what to *render*; every API call is
 * authorised by the server regardless of what this component does.
 */
export function ConsoleShell({ children }: { children: ReactNode }) {
  const { session, logout, retry } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (session.status === 'anonymous')
      router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
  }, [session.status, router, pathname]);

  if (session.status === 'loading' || session.status === 'anonymous') {
    return <Spinner label={session.status === 'loading' ? 'Loading…' : 'Redirecting to login…'} />;
  }
  if (session.status === 'error') {
    return (
      <ErrorState
        message="Could not verify your session. The server may be unreachable."
        onRetry={retry}
      />
    );
  }

  const { user } = session;
  return (
    <div className="gap-8 md:grid md:grid-cols-[13.5rem_1fr]">
      <aside className="mb-6 md:sticky md:top-24 md:mb-0 md:self-start">
        <nav
          aria-label="Back office"
          className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-card md:flex-col"
        >
          {NAV.map(({ href, label, exact, icon: Icon }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${active ? 'bg-gradient-to-r from-blue-700 to-blue-600 text-white shadow-md shadow-blue-900/20' : 'text-slate-700 hover:bg-slate-100'}`}
              >
                <Icon className="h-[1.1rem] w-[1.1rem]" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-sm font-bold uppercase text-white"
            >
              {user.email.slice(0, 2)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">{user.email}</p>
              <Badge
                tone={user.role === 'ADMIN' ? 'violet' : user.role === 'SALES' ? 'blue' : 'slate'}
              >
                {user.role}
              </Badge>
            </div>
          </div>
          <Button
            variant="secondary"
            className="mt-4 w-full"
            onClick={() => void logout().then(() => router.replace('/admin/login'))}
          >
            Log out
          </Button>
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
