import { UnauthorizedException } from '@nestjs/common';
import { MetricsController } from './metrics.controller';

const controller = new MetricsController({
  registry: { metrics: async () => 'up 1' },
} as never);

describe('MetricsController access', () => {
  const saved = process.env.METRICS_TOKEN;
  afterEach(() => {
    if (saved === undefined) delete process.env.METRICS_TOKEN;
    else process.env.METRICS_TOKEN = saved;
  });

  it('is open when METRICS_TOKEN is unset', async () => {
    delete process.env.METRICS_TOKEN;
    await expect(controller.scrape()).resolves.toBe('up 1');
  });

  it('requires the exact bearer token when set', async () => {
    process.env.METRICS_TOKEN = 'scrape-secret';
    await expect(controller.scrape('Bearer scrape-secret')).resolves.toBe('up 1');
    await expect(controller.scrape()).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(controller.scrape('Bearer nope')).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(controller.scrape('scrape-secret')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
