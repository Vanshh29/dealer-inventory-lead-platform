'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { LEAD_STATUSES } from '@dealer/shared';
import type { Lead, LeadStatus } from '@dealer/shared';
import { api, describeError } from '@/lib/api';
import { formatDate, LEAD_STATUS_LABEL, vehicleTitle } from '@/lib/format';
import { useRemote } from '@/lib/use-remote';
import { LeadStatusBadge } from './badges';
import { buttonClass, EmptyState, ErrorState, inputClass, Pagination } from './ui';

export const LEADS_PAGE_SIZE = 20;

export function LeadsTable({ items }: { items: Lead[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Leads, newest first</caption>
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-700">
          <tr>
            <th scope="col" className="px-4 py-3.5 font-semibold">
              Received
            </th>
            <th scope="col" className="px-4 py-3.5 font-semibold">
              Customer
            </th>
            <th scope="col" className="px-4 py-3.5 font-semibold">
              Vehicle
            </th>
            <th scope="col" className="px-4 py-3.5 font-semibold">
              Status
            </th>
            <th scope="col" className="px-4 py-3.5 font-semibold">
              Assigned to
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((lead) => (
            <tr key={lead.id} className="transition-colors hover:bg-blue-50/50">
              <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                {formatDate(lead.createdAt)}
              </td>
              <th scope="row" className="px-4 py-3 font-normal">
                <Link
                  href={`/admin/leads/${lead.id}`}
                  className="font-medium text-blue-800 hover:underline"
                >
                  {lead.name}
                </Link>
                <span className="block text-slate-600">{lead.email}</span>
              </th>
              <td className="px-4 py-3">
                {lead.vehicle ? (
                  <Link href={`/admin/vehicles/${lead.vehicle.id}`} className="hover:underline">
                    {vehicleTitle(lead.vehicle)}
                    <span className="text-slate-600"> · {lead.vehicle.year}</span>
                  </Link>
                ) : (
                  <span className="text-slate-600">Vehicle removed</span>
                )}
              </td>
              <td className="px-4 py-3">
                <LeadStatusBadge status={lead.status} />
              </td>
              <td className="px-4 py-3 text-slate-700">{lead.assignedTo?.email ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function hrefFor(status: string | undefined, q: string | undefined, page = 1): string {
  const qs = new URLSearchParams();
  if (status) qs.set('status', status);
  if (q) qs.set('q', q);
  if (page > 1) qs.set('page', String(page));
  const s = qs.toString();
  return s ? `/admin/leads?${s}` : '/admin/leads';
}

export function LeadsView() {
  const sp = useSearchParams();
  const rawStatus = sp.get('status') ?? undefined;
  const status = (LEAD_STATUSES as readonly string[]).includes(rawStatus ?? '')
    ? (rawStatus as LeadStatus)
    : undefined;
  const q = sp.get('q')?.trim().slice(0, 100) || undefined;
  const page = Math.max(1, Number(sp.get('page')) || 1);

  const leads = useRemote(
    () => api.admin.leads.list({ status, q, page, limit: LEADS_PAGE_SIZE }),
    [status, q, page],
  );

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-bold tracking-tight">Leads</h1>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <nav aria-label="Filter by status" className="flex flex-wrap gap-1.5">
          {[undefined, ...LEAD_STATUSES].map((s) => {
            const active = s === status;
            return (
              <Link
                key={s ?? 'all'}
                href={hrefFor(s, q)}
                aria-current={active ? 'true' : undefined}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${active ? 'border-blue-700 bg-blue-700 text-white shadow-md shadow-blue-900/20' : 'border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50'}`}
              >
                {s ? LEAD_STATUS_LABEL[s] : 'All'}
              </Link>
            );
          })}
        </nav>

        <form action="/admin/leads" method="get" role="search" className="flex gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <label htmlFor="lead-q" className="sr-only">
            Search by name or email
          </label>
          <input
            id="lead-q"
            name="q"
            type="search"
            defaultValue={q ?? ''}
            placeholder="Name or email"
            className={`${inputClass} w-56`}
          />
          <button type="submit" className={buttonClass('secondary')}>
            Search
          </button>
        </form>
      </div>

      {leads.loading && !leads.data && (
        <div role="status" aria-label="Loading leads" className="space-y-2">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-slate-200" />
          ))}
        </div>
      )}
      {leads.error !== undefined && !leads.loading && (
        <ErrorState message={describeError(leads.error)} onRetry={leads.reload} />
      )}
      {leads.data && !leads.error && (
        <>
          <p className="text-sm text-slate-700" aria-live="polite">
            {leads.data.total} {leads.data.total === 1 ? 'lead' : 'leads'}
          </p>
          {leads.data.items.length === 0 ? (
            <EmptyState title="No leads found">
              {status || q
                ? 'Try another status or search term.'
                : 'New enquiries from the website will appear here.'}
            </EmptyState>
          ) : (
            <>
              <LeadsTable items={leads.data.items} />
              <Pagination
                page={leads.data.page}
                limit={leads.data.limit}
                total={leads.data.total}
                hrefFor={(p) => hrefFor(status, q, p)}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
