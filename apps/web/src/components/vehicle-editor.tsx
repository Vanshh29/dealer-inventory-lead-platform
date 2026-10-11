'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, describeError } from '@/lib/api';
import { vehicleTitle } from '@/lib/format';
import { canManageVehicles, useUser } from '@/lib/session';
import { useRemote } from '@/lib/use-remote';
import { VehicleStatusBadge } from './badges';
import { VehicleForm } from './vehicle-form';
import { VehicleImages } from './vehicle-images';
import { Button, EmptyState, ErrorState, Spinner } from './ui';

export function VehicleEditor({ id }: { id: string }) {
  const user = useUser();
  const router = useRouter();
  const canEdit = canManageVehicles(user.role);
  const vehicle = useRemote(() => api.admin.vehicles.get(id), [id]);
  const [error, setError] = useState<string | null>(null);

  if (vehicle.loading && !vehicle.data) return <Spinner />;
  if (vehicle.error !== undefined && !vehicle.data) {
    return <ErrorState message={describeError(vehicle.error)} onRetry={vehicle.reload} />;
  }
  const v = vehicle.data!;

  async function remove() {
    if (!window.confirm(`Delete ${vehicleTitle(v)} permanently? Leads for it are kept.`)) return;
    try {
      await api.admin.vehicles.remove(id);
      router.replace('/admin/vehicles');
    } catch (e) {
      setError(describeError(e));
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/admin/vehicles" className="text-sm text-blue-800 hover:underline">
        ← All vehicles
      </Link>
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{vehicleTitle(v)}</h1>
        <VehicleStatusBadge status={v.status} />
      </header>
      {!canEdit && <p className="text-sm text-slate-700">You have read-only access to vehicles.</p>}
      {error && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900"
        >
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section aria-label="Vehicle details" className="glass rounded-2xl p-4">
          <VehicleForm vehicle={v} readOnly={!canEdit} onSaved={vehicle.reload} />
        </section>
        <div className="space-y-6">
          <VehicleImages vehicle={v} canEdit={canEdit} onChanged={vehicle.reload} />
          {canEdit && (
            <section
              aria-labelledby="danger-h"
              className="rounded-2xl border border-red-200 bg-white/80 p-4 backdrop-blur"
            >
              <h2 id="danger-h" className="text-lg font-semibold text-red-900">
                Danger zone
              </h2>
              <p className="mt-1 text-sm text-slate-700">
                Deleting removes the vehicle and its photos. Existing leads stay.
              </p>
              <Button variant="danger" className="mt-3" onClick={() => void remove()}>
                Delete vehicle
              </Button>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

export function NewVehicle() {
  const user = useUser();
  if (!canManageVehicles(user.role)) {
    return <EmptyState title="Admins only">Only administrators can add vehicles.</EmptyState>;
  }
  return (
    <div className="space-y-6">
      <Link href="/admin/vehicles" className="text-sm text-blue-800 hover:underline">
        ← All vehicles
      </Link>
      <h1 className="text-2xl font-bold">Add vehicle</h1>
      <p className="text-sm text-slate-700">
        Save the vehicle first, then add photos on the next screen.
      </p>
      <div className="glass rounded-2xl p-4">
        <VehicleForm />
      </div>
    </div>
  );
}
