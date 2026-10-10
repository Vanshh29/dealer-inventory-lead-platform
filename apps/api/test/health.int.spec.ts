import { INestApplication, ServiceUnavailableException } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/common/prisma.service';
import { createApp } from './helpers';

describe('health and metrics', () => {
  let app: INestApplication;
  const get = (url: string) => request(app.getHttpServer()).get(url);
  beforeAll(async () => (app = await createApp()));
  afterAll(async () => app.close());
  afterEach(() => {
    delete process.env.METRICS_TOKEN;
    jest.restoreAllMocks();
  });

  describe('GET /health (liveness)', () => {
    it('is public and returns ok', async () => {
      const res = await get('/health').expect(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('GET /health/ready (readiness)', () => {
    it('is ok while the database answers', async () => {
      await get('/health/ready').expect(200, { status: 'ok' });
    });

    it('is 503 when the database does not answer, with no internals in the body', async () => {
      jest
        .spyOn(app.get(PrismaService).user, 'findFirst')
        .mockRejectedValue(new Error('ECONNREFUSED 10.0.0.5:5432'));
      const res = await get('/health/ready').expect(503);
      expect(JSON.stringify(res.body)).not.toContain('10.0.0.5');
      expect(res.body.message).toBe(
        new ServiceUnavailableException('Database unavailable').message,
      );
    });
  });

  describe('GET /metrics', () => {
    it('exposes request duration labelled with the route pattern, not the URL', async () => {
      await get('/vehicles/00000000-0000-4000-8000-000000000001'); // 404
      await get('/vehicles/00000000-0000-4000-8000-000000000002'); // 404
      await get('/no-such-path-' + 'x'.repeat(8)).expect(404);
      const res = await get('/metrics').expect(200);
      expect(res.headers['content-type']).toMatch(/text\/plain/);
      expect(res.text).toMatch(
        /http_request_duration_seconds_count\{method="GET",route="\/vehicles\/:id",status="404"\} 2/,
      );
      expect(res.text).toContain('route="unmatched"');
      expect(res.text).not.toContain('00000000-0000-4000'); // no per-id series
      expect(res.text).toContain('process_cpu_user_seconds_total'); // default metrics
      expect(res.text).not.toContain('route="/metrics"');
    });

    it('is open when METRICS_TOKEN is not set', async () => {
      await get('/metrics').expect(200);
    });

    it('requires the bearer token when METRICS_TOKEN is set', async () => {
      process.env.METRICS_TOKEN = 'scrape-secret';
      await get('/metrics').expect(401);
      await get('/metrics').set('Authorization', 'Bearer wrong').expect(401);
      await get('/metrics').set('Authorization', 'Bearer scrape-secret').expect(200);
    });

    it('is not rate limited (a scraper hits it every few seconds)', async () => {
      for (let i = 0; i < 5; i++) await get('/metrics').expect(200);
    });
  });
});
