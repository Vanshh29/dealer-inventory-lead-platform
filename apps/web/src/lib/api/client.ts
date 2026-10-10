import {
  auditLogSchema,
  facetsSchema,
  authUserSchema,
  leadNoteSchema,
  leadReceivedSchema,
  leadSchema,
  statsSchema,
  pageSchema,
  userSchema,
  vehicleImageSchema,
  vehicleSchema,
} from '@dealer/shared';
import type {
  AuditLogEntry,
  Facets,
  Stats,
  AuthUser,
  CatalogParams,
  Lead,
  LeadInput,
  LeadListParams,
  LeadNote,
  Page,
  User,
  UserInput,
  Vehicle,
  VehicleImage,
  VehicleInput,
  VehicleStatus,
  LeadStatus,
} from '@dealer/shared';
import { createHttp, type Http, type HttpConfig } from './http';

const pageOf = <T>(schema: Parameters<typeof pageSchema>[0]) =>
  pageSchema(schema) as unknown as import('zod').ZodType<Page<T>>;

const vehiclePage = pageOf<Vehicle>(vehicleSchema);
const leadPage = pageOf<Lead>(leadSchema);
const notePage = pageOf<LeadNote>(leadNoteSchema);
const userPage = pageOf<User>(userSchema);
const auditPage = pageOf<AuditLogEntry>(auditLogSchema);

interface PageParams {
  page?: number;
  limit?: number;
}

/** Builds the typed API surface on top of an Http instance. */
export function createApiClient(config: HttpConfig, http: Http = createHttp(config)) {
  const { request } = http;

  return {
    auth: {
      login: (email: string, password: string) =>
        request<AuthUser>('/auth/login', {
          method: 'POST',
          body: { email, password },
          schema: authUserSchema,
        }),
      logout: () => request('/auth/logout', { method: 'POST' }),
      me: () => request<AuthUser>('/auth/me', { schema: authUserSchema }),
    },

    /** Public catalog: no login needed. */
    catalog: {
      search: (
        params: CatalogParams = {},
        init?: RequestInit & { next?: { revalidate?: number } },
      ) => request<Page<Vehicle>>('/vehicles', { query: { ...params }, schema: vehiclePage, init }),
      facets: (init?: RequestInit & { next?: { revalidate?: number } }) =>
        request<Facets>('/vehicles/facets', { schema: facetsSchema, init }),
      get: (id: string, init?: RequestInit & { next?: { revalidate?: number } }) =>
        request<Vehicle>(`/vehicles/${id}`, { schema: vehicleSchema, init }),
    },

    leads: {
      /** Public lead form. The honeypot field is always sent empty. */
      submit: async (input: LeadInput): Promise<void> => {
        await request('/leads', {
          method: 'POST',
          body: { ...input, website: input.website ?? '' },
          schema: leadReceivedSchema,
        });
      },
    },

    admin: {
      vehicles: {
        list: (params: PageParams & { status?: VehicleStatus } = {}) =>
          request<Page<Vehicle>>('/admin/vehicles', { query: { ...params }, schema: vehiclePage }),
        get: (id: string) => request<Vehicle>(`/admin/vehicles/${id}`, { schema: vehicleSchema }),
        create: (input: VehicleInput) =>
          request<Vehicle>('/admin/vehicles', {
            method: 'POST',
            body: input,
            schema: vehicleSchema,
          }),
        update: (id: string, input: Partial<VehicleInput>) =>
          request<Vehicle>(`/admin/vehicles/${id}`, {
            method: 'PATCH',
            body: input,
            schema: vehicleSchema,
          }),
        remove: (id: string) => request(`/admin/vehicles/${id}`, { method: 'DELETE' }),
        uploadImage: (id: string, file: Blob, filename?: string) => {
          const form = new FormData();
          form.append('file', file, filename);
          return request<VehicleImage>(`/admin/vehicles/${id}/images`, {
            method: 'POST',
            form,
            schema: vehicleImageSchema,
          });
        },
        removeImage: (id: string, imageId: string) =>
          request(`/admin/vehicles/${id}/images/${imageId}`, { method: 'DELETE' }),
      },

      leads: {
        list: (params: LeadListParams = {}) =>
          request<Page<Lead>>('/admin/leads', { query: { ...params }, schema: leadPage }),
        get: (id: string) => request<Lead>(`/admin/leads/${id}`, { schema: leadSchema }),
        changeStatus: (id: string, status: LeadStatus) =>
          request<Lead>(`/admin/leads/${id}/status`, {
            method: 'PATCH',
            body: { status },
            schema: leadSchema,
          }),
        assign: (id: string, assignedToId: string | null) =>
          request<Lead>(`/admin/leads/${id}/assignment`, {
            method: 'PATCH',
            body: { assignedToId },
            schema: leadSchema,
          }),
        notes: (id: string, params: PageParams = {}) =>
          request<Page<LeadNote>>(`/admin/leads/${id}/notes`, {
            query: { ...params },
            schema: notePage,
          }),
        addNote: (id: string, text: string) =>
          request<LeadNote>(`/admin/leads/${id}/notes`, {
            method: 'POST',
            body: { text },
            schema: leadNoteSchema,
          }),
      },

      users: {
        list: (params: PageParams = {}) =>
          request<Page<User>>('/users', { query: { ...params }, schema: userPage }),
        create: (input: UserInput) =>
          request<User>('/users', { method: 'POST', body: input, schema: userSchema }),
      },

      stats: () => request<Stats>('/admin/stats', { schema: statsSchema }),

      auditLogs: (
        params: PageParams & { entity?: string; entityId?: string; actorId?: string } = {},
      ) =>
        request<Page<AuditLogEntry>>('/admin/audit-logs', {
          query: { ...params },
          schema: auditPage,
        }),
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
