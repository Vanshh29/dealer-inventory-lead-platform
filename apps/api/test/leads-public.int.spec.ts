import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/common/prisma.service';
import { createApp, createVehicle, resetDb } from './helpers';

describe('Public lead submission', () => {
  let app: INestApplication;
  let vehicleId: string;
  const post = (body: object) => request(app.getHttpServer()).post('/leads').send(body);
  const valid = () => ({
    vehicleId,
    name: 'Erika Musterfrau',
    email: 'Erika@Example.com',
    phone: '+49 170 1234567',
    message: 'I would like a test drive.',
  });

  beforeAll(async () => (app = await createApp()));
  afterAll(async () => app.close());
  beforeEach(async () => {
    await resetDb(app);
    vehicleId = (await createVehicle(app)).id;
  });

  it('accepts a valid lead without login, stores it as NEW and audits it', async () => {
    const res = await post(valid()).expect(201);
    expect(res.body).toEqual({ received: true }); // no internal data leaks back

    const prisma = app.get(PrismaService);
    const lead = await prisma.lead.findFirstOrThrow();
    expect(lead).toMatchObject({ status: 'NEW', email: 'erika@example.com', vehicleId });
    const audit = await prisma.auditLog.findFirstOrThrow({ where: { entity: 'Lead' } });
    expect(audit).toMatchObject({ action: 'LEAD_CREATED', actorId: null, entityId: lead.id });
  });

  it('phone is optional', async () => {
    const body: Partial<ReturnType<typeof valid>> = valid();
    delete body.phone;
    await post(body).expect(201);
  });

  it('404 for unknown, draft or sold vehicles (indistinguishable)', async () => {
    await post({ ...valid(), vehicleId: '00000000-0000-4000-8000-000000000000' }).expect(404);
    const draft = await createVehicle(app, { status: 'DRAFT' });
    const sold = await createVehicle(app, { status: 'SOLD' });
    await post({ ...valid(), vehicleId: draft.id }).expect(404);
    await post({ ...valid(), vehicleId: sold.id }).expect(404);
    expect(await app.get(PrismaService).lead.count()).toBe(0);
  });

  it.each([
    ['bad email', { email: 'nope' }],
    ['empty name', { name: '   ' }],
    ['missing message', { message: undefined }],
    ['too long message', { message: 'x'.repeat(2001) }],
    ['bad phone', { phone: 'call me maybe' }],
    ['bad vehicleId', { vehicleId: 'abc' }],
    ['status smuggled in', { status: 'WON' }],
    ['assignment smuggled in', { assignedToId: '00000000-0000-4000-8000-000000000000' }],
  ])('rejects %s with 400', async (_n, patch) => {
    await post({ ...valid(), ...patch }).expect(400);
    expect(await app.get(PrismaService).lead.count()).toBe(0);
  });

  it('silently drops honeypot submissions: same 201 response, nothing stored', async () => {
    const res = await post({ ...valid(), website: 'http://spam.example' }).expect(201);
    expect(res.body).toEqual({ received: true });
    const prisma = app.get(PrismaService);
    expect(await prisma.lead.count()).toBe(0);
    expect(await prisma.auditLog.count()).toBe(0);
  });
});

describe('Public lead rate limiting', () => {
  let app: INestApplication;
  beforeAll(async () => {
    process.env.LEAD_RATE_LIMIT = '3';
    app = await createApp();
    await resetDb(app);
  });
  afterAll(async () => {
    process.env.LEAD_RATE_LIMIT = '1000';
    await app.close();
  });

  it('answers 429 after too many submissions from one client', async () => {
    const v = await createVehicle(app);
    const send = () =>
      request(app.getHttpServer())
        .post('/leads')
        .send({ vehicleId: v.id, name: 'A', email: 'a@example.com', message: 'hi' });
    for (let i = 0; i < 3; i++) await send().expect(201);
    await send().expect(429);
  });
});
