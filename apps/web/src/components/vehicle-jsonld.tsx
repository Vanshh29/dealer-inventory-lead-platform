import type { Vehicle, VehicleStatus } from '@dealer/shared';
import { assetUrl } from '@/lib/api';
import { SITE_URL } from '@/lib/site-url';

const AVAILABILITY: Record<VehicleStatus, string> = {
  PUBLISHED: 'https://schema.org/InStock',
  RESERVED: 'https://schema.org/LimitedAvailability',
  SOLD: 'https://schema.org/SoldOut',
  DRAFT: 'https://schema.org/OutOfStock',
};

const absolute = (url: string) => (url.startsWith('/') ? `${SITE_URL}${url}` : url);

/** schema.org Car + Offer for a vehicle detail page. */
export function buildVehicleJsonLd(v: Vehicle) {
  const name = [v.year, v.make, v.model, v.variant].filter(Boolean).join(' ');
  return {
    '@context': 'https://schema.org',
    '@type': 'Car',
    name,
    brand: { '@type': 'Brand', name: v.make },
    model: v.model,
    vehicleIdentificationNumber: v.vin,
    vehicleModelDate: String(v.year),
    mileageFromOdometer: { '@type': 'QuantitativeValue', value: v.mileage, unitCode: 'KMT' },
    fuelType: v.fuel,
    vehicleTransmission: v.gearbox,
    color: v.color,
    description: v.description || undefined,
    image: v.images.map((i) => absolute(assetUrl(i.url))),
    url: `${SITE_URL}/vehicles/${v.id}`,
    offers: {
      '@type': 'Offer',
      // Integer cents to a decimal string without float arithmetic on the money itself.
      price: `${Math.trunc(v.priceCents / 100)}.${String(v.priceCents % 100).padStart(2, '0')}`,
      priceCurrency: 'EUR',
      availability: AVAILABILITY[v.status],
      url: `${SITE_URL}/vehicles/${v.id}`,
    },
  };
}

/** `<` is escaped so vehicle text such as "</script>" cannot break out of the script tag. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export function VehicleJsonLd({ vehicle }: { vehicle: Vehicle }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(buildVehicleJsonLd(vehicle)) }}
    />
  );
}
