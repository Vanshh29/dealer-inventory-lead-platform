'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { LEAD_SOURCES, LEAD_STATUSES, VEHICLE_STATUSES } from '@dealer/shared';
import { api, describeError } from '@/lib/api';
import {
  formatHours,
  LEAD_SOURCE_LABEL,
  LEAD_STATUS_LABEL,
  VEHICLE_STATUS_LABEL,
} from '@/lib/format';
import { useRemote } from '@/lib/use-remote';
import { useUser } from '@/lib/session';
import { ErrorState, Spinner } from './ui';

const H1 = 'text-3xl font-bold tracking-tight';
const H2 = 'mb-3 text-lg font-semibold tracking-tight';

const VEHICLE_COLOUR: Record<string, string> = {
  DRAFT: '#94a3b8',
  PUBLISHED: '#10b981',
  RESERVED: '#f59e0b',
  SOLD: '#f43f5e',
};

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

const pct = (part: number, whole: number): number =>
  whole > 0 ? Math.round((part / whole) * 100) : 0;

function Stat({
  href,
  label,
  value,
  dot,
  note,
  index = 0,
}: {
  href?: string;
  label: string;
  value: number | string;
  dot?: string;
  note?: string;
  index?: number;
}) {
  const content = (
    <>
      <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
        {dot && <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${dot}`} />}
        {label}
      </span>
      <span className="mt-2 block text-4xl font-extrabold tabular-nums tracking-tight text-slate-900">
        {typeof value === 'number' ? <CountUp value={value} /> : value}
      </span>
      {note && <span className="mt-1 block text-xs tabular-nums text-slate-600">{note}</span>}
    </>
  );
  return (
    <li className="animate-rise" style={{ animationDelay: `${index * 60}ms` }}>
      {href ? (
        <Link
          href={href}
          className="glass hover-lift sheen group block rounded-2xl p-4 hover:border-indigo-300"
        >
          {content}
        </Link>
      ) : (
        <div className="glass block rounded-2xl p-4">{content}</div>
      )}
    </li>
  );
}

/** Inline SVG donut; the legend beside it carries every value as text, so colour is never the only cue. */
function InventoryDonut({ counts }: { counts: Record<string, number> }) {
  const total = VEHICLE_STATUSES.reduce((n, st) => n + counts[st], 0);
  const r = 15.9155; // circumference 100, so dash lengths are percentages
  let offset = 0;
  const summary = VEHICLE_STATUSES.map((st) => `${counts[st]} ${VEHICLE_STATUS_LABEL[st]}`).join(
    ', ',
  );
  return (
    <div className="glass flex flex-col items-center gap-6 rounded-2xl p-5 sm:flex-row">
      <svg
        viewBox="0 0 42 42"
        role="img"
        aria-label={`Inventory by status: ${summary}`}
        className="h-40 w-40 shrink-0 -rotate-90"
      >
        <circle cx="21" cy="21" r={r} fill="none" stroke="#e2e8f0" strokeWidth="6" />
        {total > 0 &&
          VEHICLE_STATUSES.map((st) => {
            const share = (counts[st] / total) * 100;
            const circle = (
              <circle
                key={st}
                cx="21"
                cy="21"
                r={r}
                fill="none"
                stroke={VEHICLE_COLOUR[st]}
                strokeWidth="6"
                strokeDasharray={`${share} ${100 - share}`}
                strokeDashoffset={-offset}
              />
            );
            offset += share;
            return share > 0 ? circle : null;
          })}
        <g transform="rotate(90 21 21)" className="fill-slate-900">
          <text x="21" y="21.5" textAnchor="middle" fontSize="8" fontWeight="800">
            {total}
          </text>
          <text x="21" y="27" textAnchor="middle" fontSize="3" className="fill-slate-600">
            vehicles
          </text>
        </g>
      </svg>
      <ul className="grid w-full flex-1 grid-cols-2 gap-3">
        {VEHICLE_STATUSES.map((st) => (
          <li key={st}>
            <Link
              href={`/admin/vehicles?status=${st}`}
              className="flex items-start gap-2.5 rounded-xl p-2 transition hover:bg-white/80"
            >
              <span
                aria-hidden="true"
                className="mt-1 h-3 w-3 shrink-0 rounded-sm"
                style={{ background: VEHICLE_COLOUR[st] }}
              />
              <span>
                <span className="block text-sm font-medium text-slate-800">
                  {VEHICLE_STATUS_LABEL[st]}
                </span>
                <span className="block text-lg font-bold tabular-nums text-slate-900">
                  {counts[st]}
                  <span className="ml-1.5 text-xs font-medium text-slate-600">
                    {pct(counts[st], total)}%
                  </span>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
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
  const closed = s.leads.WON + s.leads.LOST;
  const sourceTotal = LEAD_SOURCES.reduce((n, src) => n + s.leadsBySource[src], 0);

  return (
    <div className="space-y-8">
      <div className="animate-rise">
        <h1 className={H1}>
          <span className="text-gradient animate-gradient">Dashboard</span>
        </h1>
        <p className="mt-1 text-slate-700">
          Signed in as {user.email}. {open} open {open === 1 ? 'lead' : 'leads'} in the pipeline.
        </p>
      </div>

      <section aria-labelledby="kpi-h">
        <h2 id="kpi-h" className="sr-only">
          Key figures
        </h2>
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat index={0} href="/admin/leads" label="Open leads" value={open} />
          <Stat index={1} href="/admin/leads?status=WON" label="Won" value={s.leads.WON} />
          <Stat
            index={2}
            label="Conversion"
            value={closed > 0 ? `${pct(s.leads.WON, closed)}%` : '—'}
            note={closed > 0 ? `${s.leads.WON} won of ${closed} closed` : 'No closed leads yet'}
          />
          <Stat
            index={3}
            href="/admin/vehicles?status=PUBLISHED"
            label="Vehicles published"
            value={s.vehicles.PUBLISHED}
          />
        </ul>
      </section>

      <section aria-labelledby="resp-h">
        <h2 id="resp-h" className={H2}>
          Response time
        </h2>
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat
            index={0}
            label="Average first response"
            value={formatHours(s.firstResponse.averageHours)}
            note={`${s.firstResponse.sampleSize} answered in the last 30 days`}
          />
          <Stat
            index={1}
            label="Median first response"
            value={formatHours(s.firstResponse.medianHours)}
            note="Half of leads are answered faster"
          />
          <Stat
            index={2}
            href="/admin/leads?status=NEW"
            label="Waiting over 24 h"
            value={s.overdueLeads}
            dot={s.overdueLeads > 0 ? 'bg-rose-500' : 'bg-emerald-500'}
            note={s.overdueLeads > 0 ? 'New leads that need a reply' : 'Everyone has been answered'}
          />
        </ul>
      </section>

      <section aria-labelledby="src-h">
        <h2 id="src-h" className={H2}>
          Where leads come from
        </h2>
        <ul className="glass space-y-3 rounded-2xl p-5">
          {LEAD_SOURCES.map((src) => {
            const n = s.leadsBySource[src];
            const share = pct(n, sourceTotal);
            return (
              <li key={src}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium text-slate-800">{LEAD_SOURCE_LABEL[src]}</span>
                  <span className="tabular-nums text-slate-700">
                    <strong className="text-slate-900">{n}</strong> · {share}%
                  </span>
                </div>
                <div
                  aria-hidden="true"
                  className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200/80"
                >
                  <div
                    className="h-full origin-left animate-grow rounded-full bg-brand"
                    style={{ width: `${share}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="pipeline-h">
        <h2 id="pipeline-h" className={H2}>
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
              note={`${pct(s.leads[st], total)}% of ${total}`}
            />
          ))}
        </ul>
      </section>

      <section aria-labelledby="inv-h">
        <h2 id="inv-h" className={H2}>
          Inventory
        </h2>
        <InventoryDonut counts={s.vehicles} />
      </section>
    </div>
  );
}
