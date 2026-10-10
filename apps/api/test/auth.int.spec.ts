import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { createApp, loginAs, PASSWORD, resetDb, seedUser } from './helpers';

describe('Auth flows', () => {
  let app: INestApplication;
  const server = () => app.getHttpServer();

  beforeAll(async () => (app = await createApp()));
  afterAll(async () => app.close());
  beforeEach(async () => {
    await resetDb(app);
    await seedUser(app, 'ADMIN');
  });

  describe('login', () => {
    it('sets httpOnly cookies and never returns tokens or hashes in the body', async () => {
      const res = await request(server())
        .post('/auth/login')
        .send({ email: 'admin@test.dev', password: PASSWORD })
        .expect(200);

      expect(res.body).toEqual({ id: expect.any(String), email: 'admin@test.dev', role: 'ADMIN' });
      const cookies = res.headers['set-cookie'] as unknown as string[];
      const access = cookies.find((c) => c.startsWith('access_token='));
      const refresh = cookies.find((c) => c.startsWith('refresh_token='));
      expect(access).toMatch(/HttpOnly/i);
      expect(refresh).toMatch(/HttpOnly/i);
      expect(refresh).toMatch(/Path=\/auth/);
    });

    it('returns the same 401 for a wrong password and an unknown email (no enumeration)', async () => {
      const wrong = await request(server())
        .post('/auth/login')
        .send({ email: 'admin@test.dev', password: 'wrong-password-123' })
        .expect(401);
      const unknown = await request(server())
        .post('/auth/login')
        .send({ email: 'nobody@test.dev', password: 'wrong-password-123' })
        .expect(401);
      expect(unknown.body).toEqual(wrong.body);
      expect(wrong.body.message).toBe('Invalid credentials');
    });

    it('rejects malformed input with a 400 in the standard error shape', async () => {
      const res = await request(server())
        .post('/auth/login')
        .send({ email: 'not-an-email' })
        .expect(400);
      expect(res.body).toMatchObject({
        statusCode: 400,
        error: 'BadRequest',
        message: 'Validation failed',
      });
      expect(Array.isArray(res.body.details)).toBe(true);
    });

    it('is case-insensitive on email', async () => {
      await request(server())
        .post('/auth/login')
        .send({ email: 'ADMIN@Test.dev', password: PASSWORD })
        .expect(200);
    });
  });

  describe('access token', () => {
    it('401 without a cookie', async () => {
      await request(server()).get('/auth/me').expect(401);
    });

    it('200 with a valid session', async () => {
      const agent = await loginAs(app, 'ADMIN');
      const res = await agent.get('/auth/me').expect(200);
      expect(res.body.role).toBe('ADMIN');
    });

    it('401 for a tampered token', async () => {
      await request(server()).get('/auth/me').set('Cookie', 'access_token=abc.def.ghi').expect(401);
    });

    it('401 for an expired token', async () => {
      const expired = await app
        .get(JwtService)
        .signAsync({ sub: 'x', email: 'a@b.c', role: 'ADMIN' }, { expiresIn: -10 });
      await request(server()).get('/auth/me').set('Cookie', `access_token=${expired}`).expect(401);
    });
  });

  describe('refresh and logout', () => {
    it('rotates the refresh token and the new session works', async () => {
      const agent = await loginAs(app, 'ADMIN');
      await agent.post('/auth/refresh').expect(200);
      await agent.get('/auth/me').expect(200);
    });

    it('detects refresh token reuse and revokes the whole session family', async () => {
      const agent = await loginAs(app, 'ADMIN');
      const login = await request(server())
        .post('/auth/login')
        .send({ email: 'admin@test.dev', password: PASSWORD });
      const stolen = (login.headers['set-cookie'] as unknown as string[])
        .find((c) => c.startsWith('refresh_token='))!
        .split(';')[0];

      await request(server()).post('/auth/refresh').set('Cookie', stolen).expect(200); // legitimate use
      await request(server()).post('/auth/refresh').set('Cookie', stolen).expect(401); // replay
      await agent.post('/auth/refresh').expect(401); // other session of the same user is revoked too
    });

    it('logout revokes the refresh token and is idempotent', async () => {
      const agent = await loginAs(app, 'ADMIN');
      const refreshCookie = (await agent.post('/auth/refresh')).headers[
        'set-cookie'
      ] as unknown as string[];
      const token = refreshCookie.find((c) => c.startsWith('refresh_token='))!.split(';')[0];

      await agent.post('/auth/logout').expect(204);
      await request(server()).post('/auth/refresh').set('Cookie', token).expect(401);
      await request(server()).post('/auth/logout').expect(204);
    });

    it('refresh without a cookie is 401', async () => {
      await request(server()).post('/auth/refresh').expect(401);
    });
  });
});

describe('Auth rate limiting', () => {
  let app: INestApplication;
  beforeAll(async () => {
    process.env.AUTH_RATE_LIMIT = '3';
    app = await createApp();
  });
  afterAll(async () => {
    process.env.AUTH_RATE_LIMIT = '1000';
    await app.close();
  });

  it('answers 429 after too many login attempts', async () => {
    const attempt = () =>
      request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'a@b.dev', password: 'whatever-123' });
    for (let i = 0; i < 3; i++) await attempt().expect(401);
    await attempt().expect(429);
  });
});
