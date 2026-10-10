'use client';

import Link from 'next/link';
import { LEAD_STATUSES, VEHICLE_STATUSES } from '@dealer/shared';
import { api, describeError } from '@/lib/api';
import { LEAD_STATUS_LABEL, VEHICLE_STATUS_LABEL } from '@/lib/format';
import { useRemote } from '@/lib/use-remote';
import { useUser } from '@/lib/session';
import { ErrorState, Spinner } from './ui';

const LEAD_TONE: Record<string, { bar: string; dot: string }> = {
  NEW: { bar: 'bg-blue-500', dot: 'bg-blue-500' },
  CONTACTED: { bar: 'bg-amber-400', dot: 'bg-amber-400' },
  TEST_DRIVE: { bar: 'bg-violet-500', dot: 'bg-violet-500' },
  OFFER: { bar: 'bg-orange-500', dot: 'bg-orange-500' },
  WON: { bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
  LOST: { bar: 'bg-rose-500', dot: 'bg-rose-500' },
};

function Stat({
  href,
  label,
  value,
  dot,
}: {
  href: string;
  label: string;
  value: number;
  dot?: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="group block rounded-2xl border border-slate-200 bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:border-blue-700 hover:shadow-lift focus-visible:outline-2 focus-visible:outline-blue-700"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
          {dot && <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${dot}`} />}
          {label}
        </span>
        <span className="mt-2 block text-4xl font-extrabold tracking-tight text-slate-900">
          {value}
        </span>
      </Link>
    </li>
  );
}

export function Dashboard() {
  const user = useUser();
  const stats = useRemote(() => api.admin.stats(), []);

  if (stats.loading && !stats.data) return <Spinner />;
  if (stats.error)
    return <ErrorState message={describeError(stats.error)} onRetry={stats.reload} />;
  const s = stats.data!;
  const total = LEAD_STATUSES.reduce((n, st) => n + s.leads[st], 0);
  const open = s.leads.NEW + s.leads.CONTACTED + s.leads.TEST_DRIVE + s.leads.OFFER;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-slate-700">
          Signed in as {user.email}. {open} open {open === 1 ? 'lead' : 'leads'} in the pipeline.
        </p>
      </div>

      <section aria-labelledby="pipeline-h">
        <h2 id="pipeline-h" className="mb-3 text-lg font-semibold tracking-tight">
          Lead pipeline
        </h2>
        {total > 0 && (
          <div
            aria-hidden="true"
            className="mb-4 flex h-3 overflow-hidden rounded-full bg-slate-200 shadow-inner"
          >
            {LEAD_STATUSES.map((st) =>
              s.leads[st] > 0 ? (
                <div
                  key={st}
                  className={LEAD_TONE[st].bar}
                  style={{ width: `${(s.leads[st] / total) * 100}%` }}
                />
              ) : null,
            )}
          </div>
        )}
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {LEAD_STATUSES.map((st) => (
            <Stat
              key={st}
              href={`/admin/leads?status=${st}`}
              label={LEAD_STATUS_LABEL[st]}
              value={s.leads[st]}
              dot={LEAD_TONE[st].dot}
            />
          ))}
        </ul>
      </section>

      <section aria-labelledby="inv-h">
        <h2 id="inv-h" className="mb-3 text-lg font-semibold tracking-tight">
          Inventory
        </h2>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {VEHICLE_STATUSES.map((st) => (
            <Stat
              key={st}
              href={`/admin/vehicles?status=${st}`}
              label={VEHICLE_STATUS_LABEL[st]}
              value={s.vehicles[st]}
            />
          ))}
        </ul>
      </section>
    </div>
  );
}
