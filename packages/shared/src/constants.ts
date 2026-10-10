export const ROLES = ['ADMIN', 'SALES', 'VIEWER'] as const;
export type Role = (typeof ROLES)[number];

export const VEHICLE_STATUSES = ['DRAFT', 'PUBLISHED', 'RESERVED', 'SOLD'] as const;
export type VehicleStatus = (typeof VEHICLE_STATUSES)[number];

export const LEAD_STATUSES = ['NEW', 'CONTACTED', 'TEST_DRIVE', 'OFFER', 'WON', 'LOST'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

/** Money is always integer cents; never floats. */
export function formatEuro(cents: number): string {
  if (!Number.isInteger(cents)) throw new Error('Price must be integer cents');
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}
