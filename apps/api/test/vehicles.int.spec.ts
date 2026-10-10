import { INestApplication } from '@nestjs/common';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';
import { createApp, createVehicle, loginAs, nextVin, PNG, resetDb, seedUser } from './helpers';

const newVehicle = () => ({
  vin: nextVin(),
  make: 'Skoda',
  model: 'Octavia',
  year: 2020,
  mileage: 45_000,
  priceCents: 1_990_000,
  fuel: 'PETROL',
  gearbox: 'AUTOMATIC',
  color: 'Blue',
});

describe('Admin vehicles', () => {
  let app: INestApplication;
  beforeAll(async () => (app = await createApp()));
  afterAll(async () => app.close());
  beforeEach(async () => {
    await resetDb(app);
    for (const r of ['ADMIN', 'SALES', 'VIEWER'] as const) await seedUser(app, r);
  });

  describe('permissions', () => {
    it('anonymous gets 401 on every admin route', async () => {
      const s = () => request(app.getHttpServer());
      await s().get('/admin/vehicles').expect(401);
      await s().post('/admin/vehicles').send(newVehicle()).expect(401);
    });

    it.each(['SALES', 'VIEWER'] as const)('%s can read but not write', async (role) => {
      const v = await createVehicle(app, { status: 'DRAFT' });
      const agent = await loginAs(app, role);
      await agent.get('/admin/vehicles').expect(200);
      await agent.get(`/admin/vehicles/${v.id}`).expect(200); // drafts are visible in the back office
      await agent.post('/admin/vehicles').send(newVehicle()).expect(403);
      await agent.patch(`/admin/vehicles/${v.id}`).send({ mileage: 1 }).expect(403);
      await agent.delete(`/admin/vehicles/${v.id}`).expect(403);
      await agent.post(`/admin/vehicles/${v.id}/images`).attach('file', PNG, 'a.png').expect(403);
    });
  });

  describe('CRUD (ADMIN)', () => {
    it('creates with DRAFT as default status and never exposes searchVector', async () => {
      const admin = await loginAs(app, 'ADMIN');
      const res = await admin.post('/admin/vehicles').send(newVehicle()).expect(201);
      expect(res.body).toMatchObject({ status: 'DRAFT', priceCents: 1_990_000, images: [] });
      expect(res.body).not.toHaveProperty('searchVector');
    });

    it('normalises the VIN to upper case', async () => {
      const admin = await loginAs(app, 'ADMIN');
      const vin = nextVin();
      const res = await admin
        .post('/admin/vehicles')
        .send({ ...newVehicle(), vin: vin.toLowerCase() })
        .expect(201);
      expect(res.body.vin).toBe(vin);
    });

    it('rejects duplicate VIN with 409', async () => {
      const admin = await loginAs(app, 'ADMIN');
      const body = newVehicle();
      await admin.post('/admin/vehicles').send(body).expect(201);
      await admin.post('/admin/vehicles').send(body).expect(409);
    });

    it.each([
      ['float price', { priceCents: 19999.5 }],
      ['negative price', { priceCents: -1 }],
      ['invalid VIN (contains I/O/Q)', { vin: 'IOQIOQIOQIOQIOQIO' }],
      ['short VIN', { vin: 'ABC' }],
      ['future year', { year: 2999 }],
      ['unknown fuel', { fuel: 'STEAM' }],
      ['unknown field', { hacked: true }],
    ])('rejects %s with 400', async (_name, patch) => {
      const admin = await loginAs(app, 'ADMIN');
      await admin
        .post('/admin/vehicles')
        .send({ ...newVehicle(), ...patch })
        .expect(400);
    });

    it('updates partially, including status changes', async () => {
      const admin = await loginAs(app, 'ADMIN');
      const v = await createVehicle(app, { status: 'DRAFT' });
      const res = await admin
        .patch(`/admin/vehicles/${v.id}`)
        .send({ status: 'PUBLISHED', priceCents: 1_400_000 })
        .expect(200);
      expect(res.body).toMatchObject({
        status: 'PUBLISHED',
        priceCents: 1_400_000,
        make: 'Volkswagen',
      });
    });

    it('404 for unknown id, 400 for malformed id', async () => {
      const admin = await loginAs(app, 'ADMIN');
      await admin.get('/admin/vehicles/00000000-0000-4000-8000-000000000000').expect(404);
      await admin
        .patch('/admin/vehicles/00000000-0000-4000-8000-000000000000')
        .send({ year: 2020 })
        .expect(404);
      await admin.get('/admin/vehicles/not-a-uuid').expect(400);
    });

    it('lists any status, paginated and filterable by status', async () => {
      const admin = await loginAs(app, 'ADMIN');
      await createVehicle(app, { status: 'DRAFT' });
      await createVehicle(app, { status: 'PUBLISHED' });
      await createVehicle(app, { status: 'SOLD' });
      expect((await admin.get('/admin/vehicles').expect(200)).body.total).toBe(3);
      expect((await admin.get('/admin/vehicles?status=DRAFT').expect(200)).body.total).toBe(1);
      expect((await admin.get('/admin/vehicles?limit=2').expect(200)).body.items).toHaveLength(2);
      await admin.get('/admin/vehicles?limit=101').expect(400);
    });

    it('deletes a vehicle and its image files', async () => {
      const admin = await loginAs(app, 'ADMIN');
      const v = await createVehicle(app);
      const img = (
        await admin.post(`/admin/vehicles/${v.id}/images`).attach('file', PNG, 'a.png').expect(201)
      ).body;
      const file = join(process.env.UPLOADS_DIR!, img.key);
      expect(existsSync(file)).toBe(true);

      await admin.delete(`/admin/vehicles/${v.id}`).expect(204);
      await admin.get(`/admin/vehicles/${v.id}`).expect(404);
      expect(existsSync(file)).toBe(false);
    });
  });

  describe('images', () => {
    it('uploads, orders by position and serves the file', async () => {
      const admin = await loginAs(app, 'ADMIN');
      const v = await createVehicle(app);
      const a = (
        await admin.post(`/admin/vehicles/${v.id}/images`).attach('file', PNG, 'a.png').expect(201)
      ).body;
      const b = (
        await admin.post(`/admin/vehicles/${v.id}/images`).attach('file', PNG, 'b.png').expect(201)
      ).body;
      expect([a.position, b.position]).toEqual([0, 1]);
      expect(a.url).toMatch(/^\/uploads\/[0-9a-f-]+\.png$/);

      const detail = await admin.get(`/admin/vehicles/${v.id}`).expect(200);
      expect(detail.body.images.map((i: { id: string }) => i.id)).toEqual([a.id, b.id]);
      await request(app.getHttpServer())
        .get(a.url)
        .expect(200)
        .expect('content-type', /image\/png/);
    });

    it('rejects non-images even when the client claims image/png (magic-byte check)', async () => {
      const admin = await loginAs(app, 'ADMIN');
      const v = await createVehicle(app);
      await admin
        .post(`/admin/vehicles/${v.id}/images`)
        .attach('file', Buffer.from('<script>alert(1)</script>'), {
          filename: 'x.png',
          contentType: 'image/png',
        })
        .expect(415);
    });

    it('rejects files over 5 MB with 413 and a missing file with 400', async () => {
      const admin = await loginAs(app, 'ADMIN');
      const v = await createVehicle(app);
      const big = Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)]);
      await admin.post(`/admin/vehicles/${v.id}/images`).attach('file', big, 'big.png').expect(413);
      await admin.post(`/admin/vehicles/${v.id}/images`).expect(400);
    });

    it('limits images per vehicle to 10', async () => {
      const admin = await loginAs(app, 'ADMIN');
      const v = await createVehicle(app);
      for (let i = 0; i < 10; i++) {
        await admin
          .post(`/admin/vehicles/${v.id}/images`)
          .attach('file', PNG, `${i}.png`)
          .expect(201);
      }
      await admin.post(`/admin/vehicles/${v.id}/images`).attach('file', PNG, 'x.png').expect(400);
    });

    it('deletes one image (row and file) and 404s for foreign image ids', async () => {
      const admin = await loginAs(app, 'ADMIN');
      const v1 = await createVehicle(app);
      const v2 = await createVehicle(app);
      const img = (
        await admin.post(`/admin/vehicles/${v1.id}/images`).attach('file', PNG, 'a.png').expect(201)
      ).body;

      await admin.delete(`/admin/vehicles/${v2.id}/images/${img.id}`).expect(404); // wrong vehicle
      const before = readdirSync(process.env.UPLOADS_DIR!).length;
      await admin.delete(`/admin/vehicles/${v1.id}/images/${img.id}`).expect(204);
      expect(readdirSync(process.env.UPLOADS_DIR!).length).toBe(before - 1);
    });
  });
});
