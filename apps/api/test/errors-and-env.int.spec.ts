import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { validateEnv } from '../src/common/env';
import { createApp } from './helpers';

describe('unexpected errors', () => {
  let app: INestApplication;
  beforeAll(async () => (app = await createApp()));
  afterAll(async () => app.close());

  it('answer 500 in the standard shape without leaking internals', async () => {
    const res = await request(app.getHttpServer()).get('/probe/boom').expect(500);
    expect(res.body).toEqual({
      statusCode: 500,
      error: 'InternalServerError',
      message: 'Internal server error',
    });
  });

  it('send a request id header and keep a sane one from the caller', async () => {
    const a = await request(app.getHttpServer()).get('/health');
    expect(a.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    const b = await request(app.getHttpServer()).get('/health').set('x-request-id', 'trace-42');
    expect(b.headers['x-request-id']).toBe('trace-42');
  });
});

describe('validateEnv (fail fast at boot)', () => {
  const ok = { DATABASE_URL: 'postgresql://x', JWT_ACCESS_SECRET: 'x'.repeat(16) };

  it('accepts a complete configuration', () => {
    expect(validateEnv(ok)).toBe(ok);
  });

  it('names every missing variable', () => {
    expect(() => validateEnv({})).toThrow('DATABASE_URL, JWT_ACCESS_SECRET');
  });

  it('rejects a short JWT secret', () => {
    expect(() => validateEnv({ ...ok, JWT_ACCESS_SECRET: 'short' })).toThrow(/at least 16/);
  });
});
