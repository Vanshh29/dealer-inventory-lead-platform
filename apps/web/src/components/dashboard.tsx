'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
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

/** Counts up to `value` once on mount; shows the final number straight away for reduced motion. */
function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || value === 0) {
      setShown(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 900);
      setShown(Math.round(value * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{shown}</>;
}

function Stat({
  href,
  label,
  value,
  dot,
  index = 0,
}: {
  href: string;
  label: string;
  value: number;
  dot?: string;
  index?: number;
}) {
  return (
    <li className="animate-rise" style={{ animationDelay: `${index * 60}ms` }}>
      <Link
        href={href}
        className="glass hover-lift sheen group block rounded-2xl p-4 hover:border-indigo-300 focus-visible:outline-2 focus-visible:outline-indigo-600"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
          {dot && <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${dot}`} />}
          {label}
        </span>
        <span className="mt-2 block text-4xl font-extrabold tabular-nums tracking-tight text-slate-900">
          <CountUp value={value} />
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
      <div className="animate-rise">
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="text-gradient animate-gradient">Dashboard</span>
        </h1>
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
            className="glass mb-4 flex h-3.5 overflow-hidden rounded-full p-0.5"
          >
            {LEAD_STATUSES.map((st) =>
              s.leads[st] > 0 ? (
                <div
                  key={st}
                  className={`${LEAD_TONE[st].bar} animate-grow origin-left first:rounded-l-full last:rounded-r-full`}
                  style={{ width: `${(s.leads[st] / total) * 100}%` }}
                />
              ) : null,
            )}
          </div>
        )}
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {LEAD_STATUSES.map((st, i) => (
            <Stat
              key={st}
              index={i}
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
          {VEHICLE_STATUSES.map((st, i) => (
            <Stat
              key={st}
              index={i}
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
