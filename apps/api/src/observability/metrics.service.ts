import { Injectable } from '@nestjs/common';
import { collectDefaultMetrics, Histogram, Registry } from 'prom-client';

/** Own registry per app instance: the global one breaks when tests boot several apps. */
@Injectable()
export class MetricsService {
  readonly registry = new Registry();

  private readonly httpDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration by method, route pattern and status',
    labelNames: ['method', 'route', 'status'] as const,
    // Tuned for an API whose typical answer is a few milliseconds.
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [this.registry],
  });

  constructor() {
    collectDefaultMetrics({ register: this.registry }); // CPU, memory, event loop lag, GC
  }

  observeHttp(method: string, route: string, status: number, seconds: number): void {
    this.httpDuration.observe({ method, route, status: String(status) }, seconds);
  }
}
