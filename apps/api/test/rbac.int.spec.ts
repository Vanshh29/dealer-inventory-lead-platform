import { INestApplication } from '@nestjs/common';
import { Role } from '@prisma/client';
import request from 'supertest';
import { createApp, loginAs, PASSWORD, resetDb, seedUser } from './helpers';

const ROLES: Role[] = ['ADMIN', 'SALES', 'VIEWER'];

// route -> roles allowed (everyone else gets 403, anonymous gets 401)
const matrix: Record<string, Role[]> = {
  '/probe/any-authenticated': ['ADMIN', 'SALES', 'VIEWER'],
  '/probe/read': ['ADMIN', 'SALES', 'VIEWER'],
  '/probe/sales': ['ADMIN', 'SALES'],
  '/probe/admin': ['ADMIN'],
  '/users': ['ADMIN'],
};

describe('RBAC enforcement', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await createApp();
    await resetDb(app);
    for (const role of ROLES) await seedUser(app, role);
  });
  afterAll(async () => app.close());

  for (const [route, allowed] of Object.entries(matrix)) {
    it(`${route}: 401 anonymous`, async () => {
      await request(app.getHttpServer()).get(route).expect(401);
    });

    for (const role of ROLES) {
      const expected = allowed.includes(role) ? 200 : 403;
      it(`${route}: ${expected} for ${role}`, async () => {
        const agent = await loginAs(app, role);
        await agent.get(route).expect(expected);
      });
    }
  }
});

describe('User management (admin only, no public registration)', () => {
  let app: INestApplication;
  beforeAll(async () => (app = await createApp()));
  afterAll(async () => app.close());
  beforeEach(async () => {
    await resetDb(app);
    for (const role of ROLES) await seedUser(app, role);
  });

  const body = { email: 'New.Person@test.dev', password: PASSWORD, role: 'SALES' };

  it('admin creates a user; response has no password hash; email is normalised', async () => {
    const admin = await loginAs(app, 'ADMIN');
    const res = await admin.post('/users').send(body).expect(201);
    expect(res.body).toMatchObject({ email: 'new.person@test.dev', role: 'SALES' });
    expect(res.body).not.toHaveProperty('passwordHash');

    // and the new user can log in
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'new.person@test.dev', password: PASSWORD })
      .expect(200);
  });

  it.each(['SALES', 'VIEWER'] as Role[])('%s cannot create users (403)', async (role) => {
    const agent = await loginAs(app, role);
    await agent.post('/users').send(body).expect(403);
  });

  it('anonymous cannot create users (401)', async () => {
    await request(app.getHttpServer()).post('/users').send(body).expect(401);
  });

  it('duplicate email is 409', async () => {
    const admin = await loginAs(app, 'ADMIN');
    await admin
      .post('/users')
      .send({ ...body, email: 'sales@test.dev' })
      .expect(409);
  });

  it('rejects weak passwords, unknown roles and extra fields (400)', async () => {
    const admin = await loginAs(app, 'ADMIN');
    await admin
      .post('/users')
      .send({ ...body, password: 'short' })
      .expect(400);
    await admin
      .post('/users')
      .send({ ...body, role: 'SUPERUSER' })
      .expect(400);
    await admin
      .post('/users')
      .send({ ...body, isAdmin: true })
      .expect(400);
  });

  it('list is paginated and bounded', async () => {
    const admin = await loginAs(app, 'ADMIN');
    const res = await admin.get('/users?page=1&limit=2').expect(200);
    expect(res.body).toMatchObject({ page: 1, limit: 2, total: 3 });
    expect(res.body.items).toHaveLength(2);
    await admin.get('/users?limit=1000').expect(400);
  });
});
