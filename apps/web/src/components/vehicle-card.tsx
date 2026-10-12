import Link from 'next/link';
import type { Vehicle } from '@dealer/shared';
import { formatEuro, formatKm, FUEL_LABEL, GEARBOX_LABEL, vehicleTitle } from '@/lib/format';
import { BoltIcon, FuelIcon } from './icons';
import { VehiclePhoto } from './vehicle-photo';

export function VehicleCard({ vehicle, index = 0 }: { vehicle: Vehicle; index?: number }) {
  const image = vehicle.images[0];
  const title = vehicleTitle(vehicle);
  const electric = vehicle.fuel === 'ELECTRIC';
  return (
    <li
      style={{ animationDelay: `${Math.min(index, 8) * 70}ms` }}
      className="group hover-lift border border-white/80 bg-white/90 shadow-card animate-rise overflow-hidden rounded-2xl focus-within:shadow-lift hover:border-indigo-200"
    >
      <Link
        href={`/vehicles/${vehicle.id}`}
        className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
          {image ? (
            <VehiclePhoto
              image={image}
              vehicle={vehicle}
              alt={`${title}, ${vehicle.color}`}
              loading="lazy"
              className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-110"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-600">
              No photo yet
            </div>
          )}
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/95 px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-sm">
            {electric ? (
              <BoltIcon className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <FuelIcon className="h-3.5 w-3.5 text-slate-600" />
            )}
            {FUEL_LABEL[vehicle.fuel]}
          </span>
          {vehicle.status === 'RESERVED' && (
            <span className="absolute right-3 top-3 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900 ring-1 ring-inset ring-amber-300">
              Reserved
            </span>
          )}
        </div>
        <div className="p-4">
          <h3 className="line-clamp-2 min-h-[2.75rem] font-semibold leading-snug text-slate-900">
            {title}
          </h3>
          <p className="mt-1 bg-gradient-to-r from-indigo-700 to-sky-600 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
            {formatEuro(vehicle.priceCents)}
          </p>
          <ul className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-200/70 pt-3 text-xs font-medium text-slate-700">
            {[
              String(vehicle.year),
              formatKm(vehicle.mileage),
              FUEL_LABEL[vehicle.fuel],
              GEARBOX_LABEL[vehicle.gearbox],
            ].map((spec) => (
              <li key={spec} className="rounded-md bg-slate-100 px-2 py-1">
                {spec}
              </li>
            ))}
          </ul>
        </div>
      </Link>
    </li>
  );
}

export function VehicleGrid({ vehicles }: { vehicles: Vehicle[] }) {
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {vehicles.map((v, i) => (
        <VehicleCard key={v.id} vehicle={v} index={i} />
      ))}
    </ul>
  );
}
