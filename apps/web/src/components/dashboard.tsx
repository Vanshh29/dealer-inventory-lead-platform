'use client';

import Link from 'next/link';
import { LEAD_STATUSES, VEHICLE_STATUSES } from '@dealer/shared';
import { api, describeError } from '@/lib/api';
import { LEAD_STATUS_LABEL, VEHICLE_STATUS_LABEL } from '@/lib/format';
import { useRemote } from '@/lib/use-remote';
import { useUser } from '@/lib/session';
import { ErrorState, Spinner } from './ui';

function Stat({ href, label, value }: { href: string; label: string; value: number }) {
  return (
    <li>
      <Link
        href={href}
        className="block rounded-lg border border-slate-200 bg-white p-4 hover:border-blue-700 focus-visible:outline-2 focus-visible:outline-blue-700"
      >
        <span className="block text-3xl font-bold text-slate-900">{value}</span>
        <span className="text-sm text-slate-700">{label}</span>
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
  const open = s.leads.NEW + s.leads.CONTACTED + s.leads.TEST_DRIVE + s.leads.OFFER;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-1 text-slate-700">
          Signed in as {user.email}. {open} open {open === 1 ? 'lead' : 'leads'} in the pipeline.
        </p>
      </div>

      <section aria-labelledby="pipeline-h">
        <h2 id="pipeline-h" className="mb-3 text-lg font-semibold">
          Lead pipeline
        </h2>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {LEAD_STATUSES.map((st) => (
            <Stat
              key={st}
              href={`/admin/leads?status=${st}`}
              label={LEAD_STATUS_LABEL[st]}
              value={s.leads[st]}
            />
          ))}
        </ul>
      </section>

      <section aria-labelledby="inv-h">
        <h2 id="inv-h" className="mb-3 text-lg font-semibold">
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
