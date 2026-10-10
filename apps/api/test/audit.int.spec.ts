import { INestApplication } from '@nestjs/common';
import { createApp, createVehicle, loginAs, nextVin, PNG, resetDb, seedUser } from './helpers';

describe('Audit trail for vehicle edits', () => {
  let app: INestApplication;
  beforeAll(async () => (app = await createApp()));
  afterAll(async () => app.close());
  beforeEach(async () => {
    await resetDb(app);
    for (const r of ['ADMIN', 'SALES', 'VIEWER'] as const) await seedUser(app, r);
  });

  const trail = async (entityId?: string) => {
    const admin = await loginAs(app, 'ADMIN');
    const q = entityId ? `&entityId=${entityId}` : '';
    const res = await admin.get(`/admin/audit-logs?entity=Vehicle${q}&limit=100`).expect(200);
    return res.body.items as {
      action: string;
      actorId: string;
      entityId: string;
      metadata: Record<string, unknown>;
    }[];
  };

  it('records create, update (with before/after), image add/remove and delete, all attributed to the admin', async () => {
    const admin = await loginAs(app, 'ADMIN');
    const adminUser = (await admin.get('/auth/me')).body;
    const created = (
      await admin
        .post('/admin/vehicles')
        .send({
          vin: nextVin(),
          make: 'Skoda',
          model: 'Octavia',
          year: 2020,
          mileage: 45_000,
          priceCents: 1_990_000,
          fuel: 'PETROL',
          gearbox: 'AUTOMATIC',
          color: 'Blue',
        })
        .expect(201)
    ).body;

    await admin
      .patch(`/admin/vehicles/${created.id}`)
      .send({ priceCents: 1_890_000, status: 'PUBLISHED' })
      .expect(200);
    const img = (
      await admin
        .post(`/admin/vehicles/${created.id}/images`)
        .attach('file', PNG, 'a.png')
        .expect(201)
    ).body;
    await admin.delete(`/admin/vehicles/${created.id}/images/${img.id}`).expect(204);
    await admin.delete(`/admin/vehicles/${created.id}`).expect(204);

    const entries = (await trail(created.id)).reverse(); // oldest first
    expect(entries.map((e) => e.action)).toEqual([
      'VEHICLE_CREATED',
      'VEHICLE_UPDATED',
      'VEHICLE_IMAGE_ADDED',
      'VEHICLE_IMAGE_REMOVED',
      'VEHICLE_DELETED',
    ]);
    expect(entries.every((e) => e.actorId === adminUser.id)).toBe(true);
    expect(entries[1].metadata).toEqual({
      changes: {
        priceCents: { from: 1_990_000, to: 1_890_000 },
        status: { from: 'DRAFT', to: 'PUBLISHED' },
      },
    });
    expect(entries[4].metadata).toMatchObject({ make: 'Skoda', model: 'Octavia' }); // survives deletion
  });

  it('skips the audit entry when an update changes nothing', async () => {
    const v = await createVehicle(app);
    const admin = await loginAs(app, 'ADMIN');
    await admin.patch(`/admin/vehicles/${v.id}`).send({ mileage: v.mileage }).expect(200);
    expect(await trail(v.id)).toHaveLength(0);
  });

  it('writes nothing for rejected or failed operations (atomic with the change)', async () => {
    const v = await createVehicle(app);
    const admin = await loginAs(app, 'ADMIN');
    await admin
      .post('/admin/vehicles')
      .send({
        vin: v.vin,
        make: 'X',
        model: 'Y',
        year: 2020,
        mileage: 1,
        priceCents: 1,
        fuel: 'PETROL',
        gearbox: 'MANUAL',
        color: 'Red',
      })
      .expect(409); // duplicate VIN
    await admin.patch(`/admin/vehicles/${v.id}`).send({ year: 1800 }).expect(400);
    await (
      await loginAs(app, 'SALES')
    )
      .patch(`/admin/vehicles/${v.id}`)
      .send({ mileage: 1 })
      .expect(403);
    expect(await trail()).toHaveLength(0);
  });

  it('filters and paginates', async () => {
    const admin = await loginAs(app, 'ADMIN');
    const body = (vin: string) => ({
      vin,
      make: 'A',
      model: 'B',
      year: 2020,
      mileage: 1,
      priceCents: 1,
      fuel: 'PETROL',
      gearbox: 'MANUAL',
      color: 'Red',
    });
    for (let i = 0; i < 3; i++)
      await admin.post('/admin/vehicles').send(body(nextVin())).expect(201);
    const page = await admin.get('/admin/audit-logs?entity=Vehicle&limit=2').expect(200);
    expect(page.body).toMatchObject({ total: 3, limit: 2 });
    expect(page.body.items).toHaveLength(2);
    await admin.get('/admin/audit-logs?limit=101').expect(400);
    await admin.get('/admin/audit-logs?actorId=nope').expect(400);
  });
});
