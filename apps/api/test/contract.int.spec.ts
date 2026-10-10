import { INestApplication } from '@nestjs/common';
import {
  apiErrorSchema,
  auditLogSchema,
  authUserSchema,
  leadNoteSchema,
  leadReceivedSchema,
  leadSchema,
  pageSchema,
  statsSchema,
  userSchema,
  vehicleImageSchema,
  vehicleSchema,
} from '@dealer/shared';
import request from 'supertest';
import {
  createApp,
  createLead,
  createVehicle,
  loginAs,
  nextVin,
  PNG,
  resetDb,
  seedUser,
} from './helpers';

/**
 * Contract tests: every response shape the web client relies on is parsed with the shared zod
 * schemas. If the API changes a field, this fails before the frontend breaks.
 */
describe('API response contracts (shared zod schemas)', () => {
  let app: INestApplication;
  let vehicleId: string;
  let leadId: string;

  beforeAll(async () => {
    app = await createApp();
    await resetDb(app);
    for (const r of ['ADMIN', 'SALES', 'VIEWER'] as const) await seedUser(app, r);
    vehicleId = (await createVehicle(app)).id;
    leadId = (await createLead(app, vehicleId)).id;
  });
  afterAll(async () => app.close());

  const FORBIDDEN_KEYS = ['passwordHash', 'searchVector', 'tokenHash'];
  const noLeaks = (body: unknown) => {
    const json = JSON.stringify(body);
    for (const k of FORBIDDEN_KEYS) expect(json).not.toContain(`"${k}"`);
  };

  it('auth: login, me, refresh return an AuthUser', async () => {
    const agent = request.agent(app.getHttpServer());
    const login = await agent
      .post('/auth/login')
      .send({ email: 'admin@test.dev', password: 'Sup3r-secret-pass!' })
      .expect(200);
    authUserSchema.parse(login.body);
    authUserSchema.parse((await agent.get('/auth/me').expect(200)).body);
    authUserSchema.parse((await agent.post('/auth/refresh').expect(200)).body);
    noLeaks(login.body);
  });

  it('users: list page and created user', async () => {
    const admin = await loginAs(app, 'ADMIN');
    const list = await admin.get('/users').expect(200);
    pageSchema(userSchema).parse(list.body);
    noLeaks(list.body);
    const created = await admin
      .post('/users')
      .send({ email: 'c@test.dev', password: 'Another-long-pass1', role: 'VIEWER' })
      .expect(201);
    userSchema.parse(created.body);
    noLeaks(created.body);
  });

  it('catalog: search page (with and without q) and detail', async () => {
    const plain = await request(app.getHttpServer()).get('/vehicles').expect(200);
    const text = await request(app.getHttpServer()).get('/vehicles?q=golf').expect(200);
    pageSchema(vehicleSchema).parse(plain.body);
    pageSchema(vehicleSchema).parse(text.body);
    expect(text.body.items.length).toBeGreaterThan(0);
    vehicleSchema.parse(
      (await request(app.getHttpServer()).get(`/vehicles/${vehicleId}`).expect(200)).body,
    );
    noLeaks(plain.body);
    noLeaks(text.body);
  });

  it('admin vehicles: list, detail, create, update, image upload', async () => {
    const admin = await loginAs(app, 'ADMIN');
    pageSchema(vehicleSchema).parse((await admin.get('/admin/vehicles').expect(200)).body);
    vehicleSchema.parse((await admin.get(`/admin/vehicles/${vehicleId}`).expect(200)).body);
    const created = await admin
      .post('/admin/vehicles')
      .send({
        vin: nextVin(),
        make: 'Opel',
        model: 'Astra',
        year: 2020,
        mileage: 1000,
        priceCents: 1_000_000,
        fuel: 'PETROL',
        gearbox: 'MANUAL',
        color: 'Red',
      })
      .expect(201);
    vehicleSchema.parse(created.body);
    noLeaks(created.body);
    vehicleSchema.parse(
      (await admin.patch(`/admin/vehicles/${created.body.id}`).send({ mileage: 5 }).expect(200))
        .body,
    );
    const img = await admin
      .post(`/admin/vehicles/${vehicleId}/images`)
      .attach('file', PNG, 'a.png')
      .expect(201);
    vehicleImageSchema.parse(img.body);
  });

  it('leads: public receipt, list, detail, status, assignment, notes', async () => {
    leadReceivedSchema.parse(
      (
        await request(app.getHttpServer())
          .post('/leads')
          .send({ vehicleId, name: 'A', email: 'a@example.com', message: 'hi' })
          .expect(201)
      ).body,
    );
    const sales = await loginAs(app, 'SALES');
    const list = await sales.get('/admin/leads').expect(200);
    pageSchema(leadSchema).parse(list.body);
    leadSchema.parse((await sales.get(`/admin/leads/${leadId}`).expect(200)).body);
    leadSchema.parse(
      (await sales.patch(`/admin/leads/${leadId}/status`).send({ status: 'CONTACTED' }).expect(200))
        .body,
    );
    const me = (await sales.get('/auth/me')).body;
    leadSchema.parse(
      (
        await sales
          .patch(`/admin/leads/${leadId}/assignment`)
          .send({ assignedToId: me.id })
          .expect(200)
      ).body,
    );
    leadNoteSchema.parse(
      (await sales.post(`/admin/leads/${leadId}/notes`).send({ text: 'note' }).expect(201)).body,
    );
    pageSchema(leadNoteSchema).parse(
      (await sales.get(`/admin/leads/${leadId}/notes`).expect(200)).body,
    );
  });

  it('a lead whose vehicle was deleted still satisfies the schema (vehicle: null)', async () => {
    const orphanVehicle = await createVehicle(app);
    const lead = await createLead(app, orphanVehicle.id);
    const admin = await loginAs(app, 'ADMIN');
    await admin.delete(`/admin/vehicles/${orphanVehicle.id}`).expect(204);
    const body = (await admin.get(`/admin/leads/${lead.id}`).expect(200)).body;
    expect(leadSchema.parse(body).vehicle).toBeNull();
  });

  it('dashboard stats: every status present, for every role', async () => {
    for (const role of ['ADMIN', 'SALES', 'VIEWER'] as const) {
      const res = await (await loginAs(app, role)).get('/admin/stats').expect(200);
      const stats = statsSchema.parse(res.body);
      expect(Object.keys(stats.leads)).toHaveLength(6);
      expect(Object.keys(stats.vehicles)).toHaveLength(4);
    }
    await request(app.getHttpServer()).get('/admin/stats').expect(401);
  });

  it('audit log page', async () => {
    const admin = await loginAs(app, 'ADMIN');
    const res = await admin.get('/admin/audit-logs').expect(200);
    pageSchema(auditLogSchema).parse(res.body);
    expect(res.body.items.length).toBeGreaterThan(0);
  });

  it.each([
    ['401', () => request(app.getHttpServer()).get('/admin/leads'), 401],
    [
      '404',
      () => request(app.getHttpServer()).get('/vehicles/00000000-0000-4000-8000-000000000000'),
      404,
    ],
    [
      '400 validation (with details)',
      () => request(app.getHttpServer()).get('/vehicles?limit=999'),
      400,
    ],
    ['403', async () => (await loginAs(app, 'VIEWER')).post('/users').send({}), 403],
    [
      '409',
      async () =>
        (await loginAs(app, 'SALES'))
          .patch(`/admin/leads/${'00000000-0000-4000-8000-000000000000'}/status`)
          .send({ status: 'NOPE' }),
      400,
    ],
  ])('error shape: %s', async (_name, call, status) => {
    const res = await call();
    expect(res.status).toBe(status);
    const body = apiErrorSchema.parse(res.body);
    if (status === 400) expect(body.details?.length).toBeGreaterThan(0);
  });
});
