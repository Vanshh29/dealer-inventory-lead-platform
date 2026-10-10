import type { LeadStatus, VehicleStatus } from '@dealer/shared';
import { LEAD_STATUS_LABEL, VEHICLE_STATUS_LABEL } from '@/lib/format';
import { Badge, type Tone } from './ui';

const leadTone: Record<LeadStatus, Tone> = {
  NEW: 'blue',
  CONTACTED: 'amber',
  TEST_DRIVE: 'violet',
  OFFER: 'amber',
  WON: 'green',
  LOST: 'red',
};
const vehicleTone: Record<VehicleStatus, Tone> = {
  DRAFT: 'slate',
  PUBLISHED: 'green',
  RESERVED: 'amber',
  SOLD: 'red',
};

// Colour is never the only signal: the label is always text.
export const LeadStatusBadge = ({ status }: { status: LeadStatus }) => (
  <Badge tone={leadTone[status]}>{LEAD_STATUS_LABEL[status]}</Badge>
);
export const VehicleStatusBadge = ({ status }: { status: VehicleStatus }) => (
  <Badge tone={vehicleTone[status]}>{VEHICLE_STATUS_LABEL[status]}</Badge>
);
