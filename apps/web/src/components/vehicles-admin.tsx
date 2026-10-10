'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { VEHICLE_STATUSES } from '@dealer/shared';
import type { Vehicle, VehicleStatus } from '@dealer/shared';
import { api, assetUrl, describeError } from '@/lib/api';
import { formatEuro, formatKm, VEHICLE_STATUS_LABEL, vehicleTitle } from '@/lib/format';
import { canManageVehicles, useUser } from '@/lib/session';
import { useRemote } from '@/lib/use-remote';
import { VehicleStatusBadge } from './badges';
import { EmptyState, ErrorState, LinkButton, Pagination } from './ui';

const PAGE_SIZE = 20;

export function VehiclesTable({ items }: { items: Vehicle[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Vehicles, newest first</caption>
        <thead className="bg-slate-50 text-slate-700">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">
              Vehicle
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Year · Mileage
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Price
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((v) => (
            <tr key={v.id} className="hover:bg-slate-50">
              <th scope="row" className="px-4 py-3 font-normal">
                <div className="flex items-center gap-3">
                  {v.images[0] ? (
                    <img
                      src={assetUrl(v.images[0].url)}
                      alt=""
                      className="h-10 w-14 rounded object-cover"
                    />
                  ) : (
                    <span aria-hidden="true" className="h-10 w-14 rounded bg-slate-200" />
                  )}
                  <div>
                    <Link
                      href={`/admin/vehicles/${v.id}`}
                      className="font-medium text-blue-800 hover:underline"
                    >
                      {vehicleTitle(v)}
                    </Link>
                    <span className="block text-xs text-slate-600">{v.vin}</span>
                  </div>
                </div>
              </th>
              <td className="px-4 py-3 text-slate-700">
                {v.year} · {formatKm(v.mileage)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right font-medium">
                {formatEuro(v.priceCents)}
              </td>
              <td className="px-4 py-3">
                <VehicleStatusBadge status={v.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const hrefFor = (status: string | undefined, page = 1): string => {
  const qs = new URLSearchParams();
  if (status) qs.set('status', status);
  if (page > 1) qs.set('page', String(page));
  const s = qs.toString();
  return s ? `/admin/vehicles?${s}` : '/admin/vehicles';
};

export function VehiclesView() {
  const user = useUser();
  const sp = useSearchParams();
  const raw = sp.get('status') ?? '';
  const status = (VEHICLE_STATUSES as readonly string[]).includes(raw)
    ? (raw as VehicleStatus)
    : undefined;
  const page = Math.max(1, Number(sp.get('page')) || 1);
  const vehicles = useRemote(
    () => api.admin.vehicles.list({ status, page, limit: PAGE_SIZE }),
    [status, page],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Vehicles</h1>
        {canManageVehicles(user.role) && (
          <LinkButton href="/admin/vehicles/new">Add vehicle</LinkButton>
        )}
      </div>

      <nav aria-label="Filter by status" className="flex flex-wrap gap-1.5">
        {[undefined, ...VEHICLE_STATUSES].map((s) => {
          const active = s === status;
          return (
            <Link
              key={s ?? 'all'}
              href={hrefFor(s)}
              aria-current={active ? 'true' : undefined}
              className={`rounded-full border px-3 py-1 text-sm ${active ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'}`}
            >
              {s ? VEHICLE_STATUS_LABEL[s] : 'All'}
            </Link>
          );
        })}
      </nav>

      {vehicles.loading && !vehicles.data && (
        <div role="status" aria-label="Loading vehicles" className="space-y-2">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-14 animate-pulse rounded bg-slate-200" />
          ))}
        </div>
      )}
      {vehicles.error !== undefined && !vehicles.loading && (
        <ErrorState message={describeError(vehicles.error)} onRetry={vehicles.reload} />
      )}
      {vehicles.data && !vehicles.error && (
        <>
          <p className="text-sm text-slate-700" aria-live="polite">
            {vehicles.data.total} vehicles
          </p>
          {vehicles.data.items.length === 0 ? (
            <EmptyState title="No vehicles found">Try a different status filter.</EmptyState>
          ) : (
            <>
              <VehiclesTable items={vehicles.data.items} />
              <Pagination
                page={vehicles.data.page}
                limit={vehicles.data.limit}
                total={vehicles.data.total}
                hrefFor={(p) => hrefFor(status, p)}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
