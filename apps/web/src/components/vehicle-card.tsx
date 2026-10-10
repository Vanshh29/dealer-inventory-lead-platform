import Link from 'next/link';
import type { Vehicle } from '@dealer/shared';
import { formatEuro, formatKm, FUEL_LABEL, GEARBOX_LABEL, vehicleTitle } from '@/lib/format';
import { BoltIcon, FuelIcon } from './icons';
import { VehiclePhoto } from './vehicle-photo';

export function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  const image = vehicle.images[0];
  const title = vehicleTitle(vehicle);
  const electric = vehicle.fuel === 'ELECTRIC';
  return (
    <li className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card transition duration-200 focus-within:shadow-lift hover:-translate-y-1 hover:shadow-lift">
      <Link
        href={`/vehicles/${vehicle.id}`}
        className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
          {image ? (
            <VehiclePhoto
              image={image}
              vehicle={vehicle}
              alt={`${title}, ${vehicle.color}`}
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-600">
              No photo yet
            </div>
          )}
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-sm">
            {electric ? (
              <BoltIcon className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <FuelIcon className="h-3.5 w-3.5 text-slate-600" />
            )}
            {FUEL_LABEL[vehicle.fuel]}
          </span>
        </div>
        <div className="p-4">
          <h3 className="truncate font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-2xl font-bold tracking-tight text-blue-800">
            {formatEuro(vehicle.priceCents)}
          </p>
          <p className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-700">
            {vehicle.year} · {formatKm(vehicle.mileage)} · {FUEL_LABEL[vehicle.fuel]} ·{' '}
            {GEARBOX_LABEL[vehicle.gearbox]}
          </p>
        </div>
      </Link>
    </li>
  );
}

export function VehicleGrid({ vehicles }: { vehicles: Vehicle[] }) {
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {vehicles.map((v) => (
        <VehicleCard key={v.id} vehicle={v} />
      ))}
    </ul>
  );
}
