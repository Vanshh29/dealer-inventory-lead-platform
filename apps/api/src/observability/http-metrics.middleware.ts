import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { MetricsService } from './metrics.service';

/**
 * Nest turns forRoutes('{*splat}') into this Express pattern. If it is all Express matched for a
 * request, no real route did.
 */
export const CATCH_ALL = '{/*splat}';

@Injectable()
export class HttpMetricsMiddleware implements NestMiddleware {
  constructor(private readonly metrics: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      // The route *pattern* (/vehicles/:id), never the URL: ids in labels would create one
      // time series per vehicle. Unmatched paths (404s, scanners) share one label for the same reason.
      const path = (req.route as { path?: string } | undefined)?.path;
      const route = path && path !== CATCH_ALL ? `${req.baseUrl}${path}` : 'unmatched';
      if (route === '/metrics') return;
      const seconds = Number(process.hrtime.bigint() - start) / 1e9;
      this.metrics.observeHttp(req.method, route, res.statusCode, seconds);
    });
    next();
  }
}
