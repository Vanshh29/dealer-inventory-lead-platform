'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useSession } from '@/lib/session';
import { Badge, Button, ErrorState, Spinner } from './ui';

const NAV = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/leads', label: 'Leads' },
  { href: '/admin/vehicles', label: 'Vehicles' },
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
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <nav aria-label="Back office" className="flex gap-1">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${active ? 'bg-blue-100 text-blue-900' : 'text-slate-700 hover:bg-slate-100'}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-700">{user.email}</span>
          <Badge tone={user.role === 'ADMIN' ? 'violet' : user.role === 'SALES' ? 'blue' : 'slate'}>
            {user.role}
          </Badge>
          <Button
            variant="secondary"
            onClick={() => void logout().then(() => router.replace('/admin/login'))}
          >
            Log out
          </Button>
        </div>
      </div>
      {children}
    </div>
  );
}
