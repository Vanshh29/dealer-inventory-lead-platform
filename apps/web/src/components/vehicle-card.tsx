import Link from 'next/link';
import type { Vehicle } from '@dealer/shared';
import { assetUrl } from '@/lib/api';
import { formatEuro, formatKm, FUEL_LABEL, GEARBOX_LABEL, vehicleTitle } from '@/lib/format';

export function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  const image = vehicle.images[0];
  const title = vehicleTitle(vehicle);
  return (
    <li className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-shadow focus-within:shadow-md hover:shadow-md">
      <Link
        href={`/vehicles/${vehicle.id}`}
        className="block focus-visible:outline-2 focus-visible:outline-blue-700"
      >
        <div className="aspect-[4/3] bg-slate-100">
          {image ? (
            <img
              src={assetUrl(image.url)}
              alt={`${title}, ${vehicle.color}`}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-600">
              No photo yet
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-xl font-bold text-blue-800">{formatEuro(vehicle.priceCents)}</p>
          <p className="mt-2 text-sm text-slate-700">
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
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {vehicles.map((v) => (
        <VehicleCard key={v.id} vehicle={v} />
      ))}
    </ul>
  );
}
