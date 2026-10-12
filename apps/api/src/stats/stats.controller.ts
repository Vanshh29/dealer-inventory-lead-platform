import { Controller, Get } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LEAD_SOURCES, LEAD_STATUSES, VEHICLE_STATUSES } from '@dealer/shared';
import { PrismaService } from '../common/prisma.service';
import { summarizeResponseTimes } from './response-time';

const DAY_MS = 86_400_000;

/** Counts for the back-office dashboard. Any logged-in role may read them. */
@ApiTags('Dashboard (back office)')
@ApiCookieAuth('access_token')
@Controller('admin/stats')
export class StatsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({
    summary:
      'Lead and vehicle counts per status, first-response times, overdue leads and leads by source',
  })
  async stats() {
    const now = Date.now();
    const [leads, vehicles, bySource, overdueLeads, answered] = await Promise.all([
      this.prisma.lead.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.vehicle.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.lead.groupBy({ by: ['source'], _count: { _all: true } }),
      this.prisma.lead.count({
        where: { status: 'NEW', createdAt: { lt: new Date(now - DAY_MS) } },
      }),
      this.prisma.lead.findMany({
        where: { firstRespondedAt: { gte: new Date(now - 30 * DAY_MS) } },
        select: { createdAt: true, firstRespondedAt: true },
      }),
    ]);
    // Every status is present (0 if none) so clients never handle missing keys.
    const fill = <S extends string>(
      all: readonly S[],
      rows: { status: S; _count: { _all: number } }[],
    ) =>
      Object.fromEntries(
        all.map((s) => [s, rows.find((r) => r.status === s)?._count._all ?? 0]),
      ) as Record<S, number>;
    return {
      leads: fill(LEAD_STATUSES, leads),
      vehicles: fill(VEHICLE_STATUSES, vehicles),
      firstResponse: summarizeResponseTimes(
        answered.flatMap((l) =>
          l.firstRespondedAt
            ? [{ createdAt: l.createdAt, firstRespondedAt: l.firstRespondedAt }]
            : [],
        ),
      ),
      overdueLeads,
      leadsBySource: fill(
        LEAD_SOURCES,
        bySource.map((r) => ({ status: r.source, _count: r._count })),
      ),
    };
  }
}
