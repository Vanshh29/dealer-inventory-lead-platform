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

/** The single timestamp format for leads: list, detail, notes and history all use it. */
export const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export const vehicleTitle = (v: Pick<Vehicle, 'make' | 'model' | 'variant'>): string =>
  [v.make, v.model, v.variant].filter(Boolean).join(' ');

/** Hours as a short human duration: minutes under an hour, otherwise one decimal of hours. */
export const formatHours = (hours: number | null): string => {
  if (hours === null) return '—';
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  return `${Math.round(hours * 10) / 10} h`;
};

export const LEAD_SOURCE_LABEL: Record<string, string> = {
  WEB: 'Website',
  PHONE: 'Phone',
  MARKETPLACE: 'Marketplace',
  OTHER: 'Other',
};
