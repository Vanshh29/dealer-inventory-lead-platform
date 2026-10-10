import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createApp, createVehicle, resetDb } from './helpers';

describe('Public catalog and search', () => {
  let app: INestApplication;
  const get = (url: string) => request(app.getHttpServer()).get(url); // note: no login anywhere
  const models = (res: request.Response) => res.body.items.map((v: { model: string }) => v.model);

  beforeAll(async () => {
    app = await createApp();
    await resetDb(app);
    await createVehicle(app, {
      make: 'Volkswagen',
      model: 'Golf',
      year: 2019,
      mileage: 60_000,
      priceCents: 1_500_000,
    });
    await createVehicle(app, {
      make: 'Volkswagen',
      model: 'Passat',
      year: 2018,
      mileage: 90_000,
      priceCents: 1_800_000,
      gearbox: 'AUTOMATIC',
      description: 'Comfortable estate car',
    });
    await createVehicle(app, {
      make: 'BMW',
      model: '320d',
      year: 2020,
      mileage: 40_000,
      priceCents: 2_500_000,
      gearbox: 'AUTOMATIC',
      color: 'Grey',
      description: 'Sporty sedan, golf clubs fit in the trunk',
    });
    await createVehicle(app, {
      make: 'Tesla',
      model: 'Model 3',
      variant: 'Long Range',
      year: 2022,
      mileage: 20_000,
      priceCents: 3_500_000,
      fuel: 'ELECTRIC',
      gearbox: 'AUTOMATIC',
      color: 'White',
      description: 'Autopilot, zero emissions',
    });
    await createVehicle(app, {
      make: 'Audi',
      model: 'A3',
      year: 2017,
      mileage: 120_000,
      priceCents: 1_200_000,
      fuel: 'PETROL',
      color: 'Red',
      description: 'Cheap and reliable',
    });
    await createVehicle(app, {
      make: 'Toyota',
      model: 'Yaris',
      year: 2021,
      mileage: 30_000,
      priceCents: 1_700_000,
      fuel: 'HYBRID',
      gearbox: 'AUTOMATIC',
      description: 'Efficient city car',
    });
    // Never visible publicly:
    await createVehicle(app, { model: 'Golf', status: 'DRAFT', description: 'draft golf' });
    await createVehicle(app, { make: 'Audi', model: 'A4', status: 'SOLD' });
    await createVehicle(app, { make: 'Audi', model: 'A6', status: 'RESERVED' });
  });
  afterAll(async () => app.close());

  describe('visibility', () => {
    it('is public and only returns PUBLISHED vehicles', async () => {
      const res = await get('/vehicles').expect(200);
      expect(res.body.total).toBe(6);
      expect(models(res)).not.toContain('A4');
      expect(res.body.items.every((v: { status: string }) => v.status === 'PUBLISHED')).toBe(true);
      expect(res.body.items[0]).not.toHaveProperty('searchVector');
    });

    it('detail works for published, 404 for draft/sold', async () => {
      const list = await get('/vehicles').expect(200);
      await get(`/vehicles/${list.body.items[0].id}`).expect(200);
      const draft = await createVehicle(app, { status: 'DRAFT' });
      await get(`/vehicles/${draft.id}`).expect(404);
      await get('/vehicles/not-a-uuid').expect(400);
    });
  });

  describe('facets', () => {
    it('lists makes with models and counts for published vehicles only', async () => {
      const res = await get('/vehicles/facets').expect(200);
      const vw = res.body.makes.find((m: { make: string }) => m.make === 'Volkswagen');
      expect(vw).toMatchObject({ count: 2 });
      expect(vw.models.map((m: { model: string }) => m.model)).toEqual(['Golf', 'Passat']);
      // the SOLD Audi A4 and RESERVED A6 must not leak through facets
      const audi = res.body.makes.find((m: { make: string }) => m.make === 'Audi');
      expect(audi.models).toEqual([{ model: 'A3', count: 1 }]);
    });
  });

  describe('filters', () => {
    it.each([
      ['make', '?make=Volkswagen', ['Golf', 'Passat']],
      ['make+model', '?make=Volkswagen&model=Passat', ['Passat']],
      ['fuel', '?fuel=ELECTRIC', ['Model 3']],
      ['gearbox', '?gearbox=MANUAL', ['Golf', 'A3']],
      ['price range (cents)', '?priceMin=1500000&priceMax=1800000', ['Golf', 'Passat', 'Yaris']],
      ['year range', '?yearMin=2020&yearMax=2021', ['320d', 'Yaris']],
      ['max mileage', '?mileageMax=40000', ['320d', 'Model 3', 'Yaris']],
      ['combined', '?fuel=DIESEL&gearbox=AUTOMATIC&mileageMax=100000', ['Passat', '320d']],
    ])('%s', async (_n, qs, expected) => {
      const res = await get(`/vehicles${qs}`).expect(200);
      expect(models(res).sort()).toEqual([...expected].sort());
      expect(res.body.total).toBe(expected.length);
    });

    it('returns an empty page, not an error, when nothing matches', async () => {
      const res = await get('/vehicles?make=Ferrari').expect(200);
      expect(res.body).toMatchObject({ items: [], total: 0 });
    });

    it('400 on invalid values and inverted ranges', async () => {
      await get('/vehicles?fuel=STEAM').expect(400);
      await get('/vehicles?priceMin=-5').expect(400);
      await get('/vehicles?priceMin=10&priceMax=5').expect(400);
      await get('/vehicles?yearMin=2022&yearMax=2000').expect(400);
      await get('/vehicles?sort=random').expect(400);
    });
  });

  describe('sorting and pagination', () => {
    it.each([
      ['price_asc', ['A3', 'Golf', 'Yaris', 'Passat', '320d', 'Model 3']],
      ['price_desc', ['Model 3', '320d', 'Passat', 'Yaris', 'Golf', 'A3']],
      ['year_desc', ['Model 3', 'Yaris', '320d', 'Golf', 'Passat', 'A3']],
      ['mileage_asc', ['Model 3', 'Yaris', '320d', 'Golf', 'Passat', 'A3']],
    ])('sort=%s', async (sort, expected) => {
      const res = await get(`/vehicles?sort=${sort}`).expect(200);
      expect(models(res)).toEqual(expected);
    });

    it('paginates without overlap and reports the total', async () => {
      const p1 = await get('/vehicles?sort=price_asc&limit=4&page=1').expect(200);
      const p2 = await get('/vehicles?sort=price_asc&limit=4&page=2').expect(200);
      expect(p1.body).toMatchObject({ page: 1, limit: 4, total: 6 });
      expect(p1.body.items).toHaveLength(4);
      expect(p2.body.items).toHaveLength(2);
      expect(models(p1).concat(models(p2))).toEqual([
        'A3',
        'Golf',
        'Yaris',
        'Passat',
        '320d',
        'Model 3',
      ]);
    });

    it('never returns unbounded lists', async () => {
      await get('/vehicles?limit=101').expect(400);
      await get('/vehicles?limit=0').expect(400);
      await get('/vehicles?page=0').expect(400);
    });
  });

  describe('full-text search', () => {
    it('ranks make/model matches above description-only matches', async () => {
      const res = await get('/vehicles?q=golf').expect(200);
      expect(models(res)).toEqual(['Golf', '320d']); // 320d only mentions "golf clubs"; draft golf is excluded
      expect(res.body.total).toBe(2);
    });

    it('supports prefix search and is case-insensitive', async () => {
      expect(models(await get('/vehicles?q=VOLKSW').expect(200)).sort()).toEqual([
        'Golf',
        'Passat',
      ]);
    });

    it('requires all terms (AND)', async () => {
      expect(models(await get('/vehicles?q=volkswagen estate').expect(200))).toEqual(['Passat']);
    });

    it('searches colour, variant and description', async () => {
      expect(models(await get('/vehicles?q=grey').expect(200))).toEqual(['320d']);
      expect(models(await get('/vehicles?q=long range').expect(200))).toEqual(['Model 3']);
      expect(models(await get('/vehicles?q=autopilot').expect(200))).toEqual(['Model 3']);
    });

    it('finds vehicles by fuel and gearbox words ("golf diesel", "tesla automatic", "hybrid")', async () => {
      expect(models(await get('/vehicles?q=golf diesel').expect(200))).toEqual(['Golf', '320d']); // BMW: diesel + "golf clubs" in description
      expect(models(await get('/vehicles?q=tesla automatic').expect(200))).toEqual(['Model 3']);
      expect(models(await get('/vehicles?q=hybrid').expect(200))).toEqual(['Yaris']);
    });

    it('combines with filters and sorting (same result as filters alone, narrowed by text)', async () => {
      const res = await get(
        '/vehicles?q=volkswagen&gearbox=AUTOMATIC&priceMax=1900000&sort=price_desc',
      ).expect(200);
      expect(models(res)).toEqual(['Passat']);
      const sorted = await get('/vehicles?q=car&sort=price_asc').expect(200); // "estate car", "Efficient city car"
      expect(models(sorted)).toEqual(['Yaris', 'Passat']);
    });

    it('paginates search results with a correct total', async () => {
      const p1 = await get('/vehicles?q=volkswagen&limit=1&page=1&sort=price_asc').expect(200);
      const p2 = await get('/vehicles?q=volkswagen&limit=1&page=2&sort=price_asc').expect(200);
      const p3 = await get('/vehicles?q=volkswagen&limit=1&page=3&sort=price_asc').expect(200);
      expect([models(p1), models(p2), models(p3)]).toEqual([['Golf'], ['Passat'], []]);
      expect([p1.body.total, p2.body.total, p3.body.total]).toEqual([2, 2, 2]);
    });

    it('returns nothing for no match', async () => {
      expect((await get('/vehicles?q=zzzzqqq').expect(200)).body.total).toBe(0);
    });

    it.each(['golf & | ! ( ) : * <->', '\'; DROP TABLE "Vehicle"; --', '\\', '%00 ::: ))))', '😀'])(
      'survives hostile input %j without an error',
      async (q) => {
        const res = await get(`/vehicles?q=${encodeURIComponent(q)}`);
        expect(res.status).toBe(200);
      },
    );

    it('treats a query with no searchable characters as no text filter', async () => {
      expect((await get('/vehicles?q=%26%7C!').expect(200)).body.total).toBe(6);
    });

    it('rejects over-long queries', async () => {
      await get(`/vehicles?q=${'a'.repeat(101)}`).expect(400);
    });
  });
});
