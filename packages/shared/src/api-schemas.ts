import { z } from 'zod';
import {
  CATALOG_SORTS,
  FUEL_TYPES,
  GEARBOXES,
  LEAD_SOURCES,
  LEAD_STATUSES,
  ROLES,
  VEHICLE_STATUSES,
} from './constants';

/**
 * Response contracts. Single source of truth for the shape of API responses:
 *  - the web client validates responses against them at runtime,
 *  - the API's contract tests parse real responses against them,
 *  - TypeScript types are inferred from them, so types cannot drift from reality.
 * Schemas are tolerant of extra fields (forward compatible during rolling deploys); leaks of
 * sensitive fields are covered by explicit tests in the API.
 * Dates travel as ISO strings.
 */

export const pageSchema = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    page: z.number().int().min(1),
    limit: z.number().int().min(1).max(100),
    total: z.number().int().min(0),
  });
export type Page<T> = { items: T[]; page: number; limit: number; total: number };

export const apiErrorSchema = z.object({
  statusCode: z.number().int(),
  error: z.string(),
  message: z.string(),
  /** Present on 400 validation errors: one message per violated rule. */
  details: z.array(z.string()).optional(),
});
export type ApiErrorBody = z.infer<typeof apiErrorSchema>;

export const authUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: z.enum(ROLES),
});
export type AuthUser = z.infer<typeof authUserSchema>;

export const userSchema = authUserSchema.extend({ createdAt: z.string() });
export type User = z.infer<typeof userSchema>;

export const vehicleImageSchema = z.object({
  id: z.string(),
  vehicleId: z.string(),
  key: z.string(),
  /** Relative to the API origin, e.g. /uploads/abc.jpg, or an absolute URL (seed data). */
  url: z.string(),
  position: z.number().int(),
});
export type VehicleImage = z.infer<typeof vehicleImageSchema>;

export const vehicleSchema = z.object({
  id: z.string(),
  vin: z.string(),
  make: z.string(),
  model: z.string(),
  variant: z.string().nullable(),
  year: z.number().int(),
  mileage: z.number().int(),
  /** Integer cents. Format with formatEuro(). */
  priceCents: z.number().int(),
  fuel: z.enum(FUEL_TYPES),
  gearbox: z.enum(GEARBOXES),
  color: z.string(),
  description: z.string(),
  status: z.enum(VEHICLE_STATUSES),
  images: z.array(vehicleImageSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Vehicle = z.infer<typeof vehicleSchema>;

export const leadSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  message: z.string(),
  status: z.enum(LEAD_STATUSES),
  source: z.enum(LEAD_SOURCES),
  utmSource: z.string().nullable(),
  utmMedium: z.string().nullable(),
  utmCampaign: z.string().nullable(),
  /** null for leads created before consent was recorded, or entered by staff. */
  consentAt: z.string().nullable(),
  /** First time the lead left NEW; null while untouched. */
  firstRespondedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  /** null when the vehicle was deleted after the lead came in. */
  vehicle: z
    .object({
      id: z.string(),
      make: z.string(),
      model: z.string(),
      variant: z.string().nullable(),
      year: z.number().int(),
    })
    .nullable(),
  assignedTo: z.object({ id: z.string(), email: z.string(), role: z.enum(ROLES) }).nullable(),
  noteCount: z.number().int().min(0),
  /** Valid next statuses; the UI offers exactly these. */
  allowedTransitions: z.array(z.enum(LEAD_STATUSES)),
});
export type Lead = z.infer<typeof leadSchema>;

export const leadNoteSchema = z.object({
  id: z.string(),
  leadId: z.string(),
  text: z.string(),
  createdAt: z.string(),
  author: z.object({ id: z.string(), email: z.string() }),
});
export type LeadNote = z.infer<typeof leadNoteSchema>;

export const auditLogSchema = z.object({
  id: z.string(),
  actorId: z.string().nullable(),
  action: z.string(),
  entity: z.string(),
  entityId: z.string(),
  metadata: z.unknown(),
  createdAt: z.string(),
});
export type AuditLogEntry = z.infer<typeof auditLogSchema>;

export const facetsSchema = z.object({
  makes: z.array(
    z.object({
      make: z.string(),
      count: z.number().int(),
      models: z.array(z.object({ model: z.string(), count: z.number().int() })),
    }),
  ),
});
export type Facets = z.infer<typeof facetsSchema>;

export const statsSchema = z.object({
  leads: z.object(
    Object.fromEntries(LEAD_STATUSES.map((s) => [s, z.number().int()])) as Record<
      (typeof LEAD_STATUSES)[number],
      z.ZodNumber
    >,
  ),
  vehicles: z.object(
    Object.fromEntries(VEHICLE_STATUSES.map((s) => [s, z.number().int()])) as Record<
      (typeof VEHICLE_STATUSES)[number],
      z.ZodNumber
    >,
  ),
  /** Hours from lead creation to first status change, for leads answered in the last 30 days. */
  firstResponse: z.object({
    averageHours: z.number().nullable(),
    medianHours: z.number().nullable(),
    sampleSize: z.number().int().min(0),
  }),
  /** NEW leads that have waited longer than 24 hours. */
  overdueLeads: z.number().int().min(0),
  leadsBySource: z.object(
    Object.fromEntries(LEAD_SOURCES.map((s) => [s, z.number().int()])) as Record<
      (typeof LEAD_SOURCES)[number],
      z.ZodNumber
    >,
  ),
});
export type Stats = z.infer<typeof statsSchema>;

export const leadReceivedSchema = z.object({ received: z.literal(true) });

/* ---------- Request shapes (what clients send) ---------- */

export interface CatalogParams {
  q?: string;
  make?: string;
  model?: string;
  /** Cents. */
  priceMin?: number;
  priceMax?: number;
  yearMin?: number;
  yearMax?: number;
  mileageMax?: number;
  fuel?: (typeof FUEL_TYPES)[number];
  gearbox?: (typeof GEARBOXES)[number];
  sort?: (typeof CATALOG_SORTS)[number];
  page?: number;
  limit?: number;
}

export interface VehicleInput {
  vin: string;
  make: string;
  model: string;
  variant?: string;
  year: number;
  mileage: number;
  priceCents: number;
  fuel: (typeof FUEL_TYPES)[number];
  gearbox: (typeof GEARBOXES)[number];
  color: string;
  description?: string;
  status?: (typeof VEHICLE_STATUSES)[number];
}

export interface LeadInput {
  vehicleId: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  /** The visitor must explicitly agree to the privacy notice. */
  consent: true;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  /** Honeypot: always send an empty string (or omit). Real users never see this field. */
  website?: string;
}

export interface LeadListParams {
  status?: (typeof LEAD_STATUSES)[number];
  assignedToId?: string;
  vehicleId?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export interface UserInput {
  email: string;
  password: string;
  role: (typeof ROLES)[number];
}
