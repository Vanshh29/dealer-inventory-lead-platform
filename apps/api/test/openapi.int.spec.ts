import { INestApplication } from '@nestjs/common';
import { OpenAPIObject } from '@nestjs/swagger';
import request from 'supertest';
import { createApp } from './helpers';
import { buildOpenApi } from '../src/swagger';

describe('OpenAPI', () => {
  let app: INestApplication;
  let doc: OpenAPIObject;
  beforeAll(async () => {
    app = await createApp({ swagger: true });
    doc = buildOpenApi(app);
  });
  afterAll(async () => app.close());

  const expected: [string, string][] = [
    ['/health', 'get'],
    ['/auth/login', 'post'],
    ['/auth/refresh', 'post'],
    ['/auth/logout', 'post'],
    ['/auth/me', 'get'],
    ['/users', 'get'],
    ['/users', 'post'],
    ['/vehicles', 'get'],
    ['/vehicles/facets', 'get'],
    ['/vehicles/{id}', 'get'],
    ['/admin/vehicles', 'get'],
    ['/admin/vehicles', 'post'],
    ['/admin/vehicles/{id}', 'get'],
    ['/admin/vehicles/{id}', 'patch'],
    ['/admin/vehicles/{id}', 'delete'],
    ['/leads', 'post'],
    ['/admin/leads', 'get'],
    ['/admin/leads/{id}', 'get'],
    ['/admin/leads/{id}/status', 'patch'],
    ['/admin/leads/{id}/assignment', 'patch'],
    ['/admin/leads/{id}/notes', 'get'],
    ['/admin/leads/{id}/notes', 'post'],
    ['/admin/audit-logs', 'get'],
    ['/admin/stats', 'get'],
    ['/admin/vehicles/{id}/images', 'post'],
    ['/admin/vehicles/{id}/images/{imageId}', 'delete'],
  ];

  it.each(expected)('documents %s %s with a summary', (path, method) => {
    const op = (doc.paths[path] as Record<string, { summary?: string }> | undefined)?.[method];
    expect(op?.summary).toBeTruthy();
  });

  it('documents exactly the routes we expect (no undocumented endpoints; probe routes excluded)', () => {
    const documented = Object.entries(doc.paths).flatMap(([p, ops]) =>
      Object.keys(ops).map((m) => `${m} ${p}`),
    );
    const real = documented.filter((d) => !d.includes('/probe/'));
    expect(real.sort()).toEqual(expected.map(([p, m]) => `${m} ${p}`).sort());
  });

  it('serves Swagger UI at /api/docs', async () => {
    await request(app.getHttpServer())
      .get('/api/docs')
      .redirects(1)
      .expect(200)
      .expect('content-type', /html/);
    const json = await request(app.getHttpServer()).get('/api/docs-json').expect(200);
    expect(json.body.openapi).toMatch(/^3\./);
  });
});
