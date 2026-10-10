import type { FuelType, Gearbox, LeadStatus, Vehicle, VehicleStatus } from '@dealer/shared';

export { formatEuro } from '@dealer/shared';

export const FUEL_LABEL: Record<FuelType, string> = {
  PETROL: 'Petrol',
  DIESEL: 'Diesel',
  ELECTRIC: 'Electric',
  HYBRID: 'Hybrid',
  PLUGIN_HYBRID: 'Plug-in hybrid',
  LPG: 'LPG',
};

export const GEARBOX_LABEL: Record<Gearbox, string> = { MANUAL: 'Manual', AUTOMATIC: 'Automatic' };

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  TEST_DRIVE: 'Test drive',
  OFFER: 'Offer',
  WON: 'Won',
  LOST: 'Lost',
};

export const VEHICLE_STATUS_LABEL: Record<VehicleStatus, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  RESERVED: 'Reserved',
  SOLD: 'Sold',
};

export const formatKm = (km: number): string => `${km.toLocaleString('de-DE')} km`;

export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

export const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });

export const vehicleTitle = (v: Pick<Vehicle, 'make' | 'model' | 'variant'>): string =>
  [v.make, v.model, v.variant].filter(Boolean).join(' ');
