import { apiErrorSchema, leadSchema, pageSchema, statsSchema, vehicleSchema } from './api-schemas';
import { LEAD_SOURCES, LEAD_STATUSES, VEHICLE_STATUSES } from './constants';

const vehicle = {
  id: 'v1',
  vin: 'WVWZZZ1JZXW000001',
  make: 'VW',
  model: 'Golf',
  variant: null,
  year: 2019,
  mileage: 1,
  priceCents: 1500000,
  fuel: 'DIESEL',
  gearbox: 'MANUAL',
  color: 'Black',
  description: '',
  status: 'PUBLISHED',
  images: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('api schemas', () => {
  it('accepts a valid vehicle and tolerates extra fields', () => {
    expect(vehicleSchema.parse({ ...vehicle, somethingNew: 1 }).make).toBe('VW');
  });

  it('rejects float prices, unknown enums and missing fields', () => {
    expect(vehicleSchema.safeParse({ ...vehicle, priceCents: 10.5 }).success).toBe(false);
    expect(vehicleSchema.safeParse({ ...vehicle, fuel: 'STEAM' }).success).toBe(false);
    expect(vehicleSchema.safeParse({ ...vehicle, images: undefined }).success).toBe(false);
  });

  it('validates pages', () => {
    const schema = pageSchema(vehicleSchema);
    expect(schema.safeParse({ items: [vehicle], page: 1, limit: 20, total: 1 }).success).toBe(true);
    expect(schema.safeParse({ items: [], page: 0, limit: 20, total: 0 }).success).toBe(false);
  });

  it('validates error bodies and leads', () => {
    expect(
      apiErrorSchema.safeParse({
        statusCode: 400,
        error: 'BadRequest',
        message: 'x',
        details: ['a'],
      }).success,
    ).toBe(true);
    expect(leadSchema.safeParse({ id: 1 }).success).toBe(false);
  });
});

describe('statsSchema (response metrics)', () => {
  const counts = (keys: readonly string[]) => Object.fromEntries(keys.map((k) => [k, 0]));
  const base = {
    leads: counts(LEAD_STATUSES),
    vehicles: counts(VEHICLE_STATUSES),
    firstResponse: { averageHours: null, medianHours: null, sampleSize: 0 },
    overdueLeads: 0,
    leadsBySource: counts(LEAD_SOURCES),
  };
  it('accepts empty metrics', () => expect(statsSchema.safeParse(base).success).toBe(true));
  it('requires every lead source', () => {
    const partial: Record<string, number> = { ...base.leadsBySource };
    delete partial.WEB;
    expect(statsSchema.safeParse({ ...base, leadsBySource: partial }).success).toBe(false);
  });
});
