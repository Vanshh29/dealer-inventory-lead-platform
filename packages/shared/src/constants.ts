export const ROLES = ['ADMIN', 'SALES', 'VIEWER'] as const;
export type Role = (typeof ROLES)[number];

export const VEHICLE_STATUSES = ['DRAFT', 'PUBLISHED', 'RESERVED', 'SOLD'] as const;
export type VehicleStatus = (typeof VEHICLE_STATUSES)[number];

export const LEAD_STATUSES = ['NEW', 'CONTACTED', 'TEST_DRIVE', 'OFFER', 'WON', 'LOST'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_SOURCES = ['WEB', 'PHONE', 'MARKETPLACE', 'OTHER'] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

/** Money is always integer cents; never floats. */
export function formatEuro(cents: number): string {
  if (!Number.isInteger(cents)) throw new Error('Price must be integer cents');
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

export const FUEL_TYPES = [
  'PETROL',
  'DIESEL',
  'ELECTRIC',
  'HYBRID',
  'PLUGIN_HYBRID',
  'LPG',
] as const;
export type FuelType = (typeof FUEL_TYPES)[number];

export const GEARBOXES = ['MANUAL', 'AUTOMATIC'] as const;
export type Gearbox = (typeof GEARBOXES)[number];

export const CATALOG_SORTS = [
  'relevance',
  'newest',
  'price_asc',
  'price_desc',
  'year_desc',
  'mileage_asc',
] as const;
export type CatalogSort = (typeof CATALOG_SORTS)[number];
