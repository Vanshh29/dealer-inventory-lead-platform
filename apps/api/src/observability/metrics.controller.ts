import { createHash, timingSafeEqual } from 'node:crypto';
import { Controller, Get, Header, Headers, UnauthorizedException } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../common/decorators';
import { MetricsService } from './metrics.service';

const digest = (s: string) => createHash('sha256').update(s).digest();

/**
 * Prometheus scrape endpoint. Metrics describe internals (routes, memory), so in production set
 * METRICS_TOKEN and give the same value to the scraper as a bearer token (or keep the path
 * unreachable from the internet at the proxy). Unset = open, which is fine for local use.
 */
@Public()
@SkipThrottle()
@ApiExcludeController()
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  async scrape(@Headers('authorization') auth?: string): Promise<string> {
    const token = process.env.METRICS_TOKEN;
    if (token && !timingSafeEqual(digest(auth ?? ''), digest(`Bearer ${token}`))) {
      throw new UnauthorizedException();
    }
    return this.metrics.registry.metrics();
  }
}
