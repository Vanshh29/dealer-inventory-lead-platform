import { INestApplication } from '@nestjs/common';
import { getComplexity, fieldExtensionsEstimator, simpleEstimator } from 'graphql-query-complexity';
import { GraphQLSchemaHost } from '@nestjs/graphql';
import { parse } from 'graphql';
import request from 'supertest';
import { MAX_COMPLEXITY } from '../src/graphql/complexity.plugin';
import { createApp, createVehicle, resetDb } from './helpers';

interface GqlResponse {
  data?: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- test helper
  errors?: { message: string; extensions?: { code?: string; stacktrace?: unknown } }[];
}

describe('GraphQL catalog', () => {
  let app: INestApplication;
  const gql = async (query: string, variables?: Record<string, unknown>) =>
    (await request(app.getHttpServer()).post('/graphql').send({ query, variables }))
      .body as GqlResponse;
  const rest = (url: string) => request(app.getHttpServer()).get(url);

  const LIST = `query($f: CatalogFilterInput) {
    vehicles(filter: $f) { total page limit items { id model priceCents fuel images { url position } } }
  }`;
  let golfId: string;
  let draftId: string;

  beforeAll(async () => {
    app = await createApp();
    await resetDb(app);
    golfId = (await createVehicle(app, { model: 'Golf', priceCents: 1_500_000 })).id;
    await createVehicle(app, {
      make: 'BMW',
      model: '320d',
      year: 2020,
      priceCents: 2_500_000,
      gearbox: 'AUTOMATIC',
    });
    await createVehicle(app, {
      make: 'Tesla',
      model: 'Model 3',
      fuel: 'ELECTRIC',
      priceCents: 3_000_000,
    });
    draftId = (await createVehicle(app, { model: 'Polo', status: 'DRAFT' })).id;
  });
  afterAll(() => app.close());

  it('lists published vehicles without logging in, hiding drafts', async () => {
    const res = await gql(LIST);
    expect(res.errors).toBeUndefined();
    expect(res.data?.vehicles.total).toBe(3);
    expect(res.data?.vehicles.page).toBe(1);
    expect(res.data?.vehicles.limit).toBe(20);
    const ids = res.data?.vehicles.items.map((v: { id: string }) => v.id);
    expect(ids).not.toContain(draftId);
  });

  it('returns the same vehicles as REST for the same filters (one service, two transports)', async () => {
    const filters = [
      { variables: { fuel: 'ELECTRIC' }, qs: 'fuel=ELECTRIC' },
      {
        variables: { priceMin: 2_000_000, sort: 'price_desc' },
        qs: 'priceMin=2000000&sort=price_desc',
      },
      { variables: { q: 'golf' }, qs: 'q=golf' },
      { variables: { gearbox: 'AUTOMATIC', limit: 1 }, qs: 'gearbox=AUTOMATIC&limit=1' },
    ];
    for (const f of filters) {
      const viaGql = await gql(LIST, { f: f.variables });
      const viaRest = await rest(`/vehicles?${f.qs}`).expect(200);
      expect(viaGql.errors).toBeUndefined();
      expect(viaGql.data?.vehicles.items.map((v: { id: string }) => v.id)).toEqual(
        viaRest.body.items.map((v: { id: string }) => v.id),
      );
      expect(viaGql.data?.vehicles.total).toBe(viaRest.body.total);
    }
  });

  it('returns exactly the requested fields', async () => {
    const res = await gql(`{ vehicles(filter: {fuel: ELECTRIC}) { items { make } } }`);
    expect(res.data).toEqual({ vehicles: { items: [{ make: 'Tesla' }] } });
  });

  it('treats explicit nulls as "not set"', async () => {
    const res = await gql(LIST, { f: { make: null, priceMin: null, fuel: null, page: null } });
    expect(res.errors).toBeUndefined();
    expect(res.data?.vehicles.total).toBe(3);
  });

  it('fetches one vehicle by id, with images and money as integer cents', async () => {
    const res = await gql(
      `query($id: ID!) { vehicle(id: $id) { id model priceCents images { url } createdAt } }`,
      { id: golfId },
    );
    expect(res.errors).toBeUndefined();
    expect(res.data?.vehicle).toMatchObject({ id: golfId, model: 'Golf', priceCents: 1_500_000 });
    expect(Number.isNaN(Date.parse(res.data?.vehicle.createdAt))).toBe(false);
  });

  it('returns null for a draft and for an unknown id', async () => {
    const q = `query($id: ID!) { vehicle(id: $id) { id } }`;
    expect((await gql(q, { id: draftId })).data).toEqual({ vehicle: null });
    expect((await gql(q, { id: '00000000-0000-4000-8000-000000000000' })).data).toEqual({
      vehicle: null,
    });
  });

  it('rejects a malformed id with a clear error', async () => {
    const res = await gql(`{ vehicle(id: "nope") { id } }`);
    expect(res.errors?.[0].message).toMatch(/uuid/i);
  });

  describe('input validation (same bounds as REST)', () => {
    it.each([
      ['limit above 100', { limit: 101 }],
      ['limit below 1', { limit: 0 }],
      ['page below 1', { page: 0 }],
      ['negative price', { priceMin: -1 }],
      ['year out of range', { yearMin: 1800 }],
      ['q longer than 100 chars', { q: 'x'.repeat(101) }],
    ])('rejects %s', async (_name, f) => {
      const res = await gql(LIST, { f });
      expect(res.errors?.length).toBeGreaterThan(0);
      expect(res.data?.vehicles ?? null).toBeNull();
    });

    it('rejects an inverted price range like REST does', async () => {
      const res = await gql(LIST, { f: { priceMin: 5, priceMax: 1 } });
      expect(res.errors?.[0].message).toMatch(/priceMin/);
    });

    it('rejects an unknown enum value at the schema level', async () => {
      const res = await gql(`{ vehicles(filter: {fuel: STEAM}) { total } }`);
      expect(res.errors?.[0].message).toMatch(/FuelType/);
    });
  });

  describe('read-only and safe by construction', () => {
    it('has no mutations', async () => {
      const res = await gql(`mutation { deleteVehicle(id: "x") }`);
      expect(res.errors?.[0].message).toMatch(/read-only/);
      expect(res.errors?.[0].extensions?.code).toBe('GRAPHQL_VALIDATION_FAILED'); // Apollo's code for any validation rule;
    });

    it('does not expose internal fields', async () => {
      const res = await gql(`{ __type(name: "Vehicle") { fields { name } } }`);
      const names = res.data?.__type.fields.map((f: { name: string }) => f.name);
      expect(names).not.toContain('status');
      expect(names).not.toContain('searchVector');
      expect(names).toContain('priceCents');
    });

    it('hides error internals: no stack traces', async () => {
      const res = await gql(`{ vehicle(id: "nope") { id } }`);
      expect(JSON.stringify(res)).not.toMatch(/stacktrace|node_modules|\.ts:/);
    });

    it('answers introspection (public catalog, nothing secret in the schema)', async () => {
      const res = await gql(`{ __schema { queryType { name } mutationType { name } } }`);
      expect(res.data?.__schema).toEqual({ queryType: { name: 'Query' }, mutationType: null });
    });
  });

  describe('depth and complexity limits', () => {
    it('allows the deepest query the schema supports', async () => {
      const res = await gql(`{ vehicles { items { images { url } } } }`);
      expect(res.errors).toBeUndefined();
    });

    it('rejects a query over the complexity budget before touching the database', async () => {
      const fields =
        'id vin make model variant year mileage priceCents fuel gearbox color description createdAt updatedAt images { id url position }';
      // Two full pages of 100 in one request (aliases are the usual way to multiply cost).
      const res = await gql(
        `{ a: vehicles(filter:{limit:100}) { items { ${fields} } } b: vehicles(filter:{limit:100}) { items { ${fields} } } }`,
      );
      expect(res.errors?.[0].extensions?.code).toBe('QUERY_TOO_COMPLEX');
      expect(res.data ?? null).toBeNull();
    });

    it('measures a single full page of 100 inside the budget', () => {
      const fields =
        'id vin make model variant year mileage priceCents fuel gearbox color description createdAt updatedAt images { id url position }';
      const doc = parse(
        `{ vehicles(filter:{limit:100}) { total page limit items { ${fields} } } }`,
      );
      const { schema } = app.get(GraphQLSchemaHost);
      const cost = getComplexity({
        schema,
        query: doc,
        variables: {},
        estimators: [fieldExtensionsEstimator(), simpleEstimator({ defaultComplexity: 1 })],
      });
      expect(cost).toBeLessThanOrEqual(MAX_COMPLEXITY);
      expect(cost).toBeGreaterThan(MAX_COMPLEXITY * 0.8); // the budget is tight, not arbitrary
    });
  });

  it('leaves REST untouched', async () => {
    const res = await rest('/vehicles').expect(200);
    expect(res.body.total).toBe(3);
  });
});
