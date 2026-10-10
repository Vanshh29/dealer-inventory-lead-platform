import { Controller, Get } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LEAD_STATUSES, VEHICLE_STATUSES } from '@dealer/shared';
import { PrismaService } from '../common/prisma.service';

/** Counts for the back-office dashboard. Any logged-in role may read them. */
@ApiTags('Dashboard (back office)')
@ApiCookieAuth('access_token')
@Controller('admin/stats')
export class StatsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Lead and vehicle counts per status' })
  async stats() {
    const [leads, vehicles] = await Promise.all([
      this.prisma.lead.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.vehicle.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);
    // Every status is present (0 if none) so clients never handle missing keys.
    const fill = <S extends string>(
      all: readonly S[],
      rows: { status: S; _count: { _all: number } }[],
    ) =>
      Object.fromEntries(
        all.map((s) => [s, rows.find((r) => r.status === s)?._count._all ?? 0]),
      ) as Record<S, number>;
    return { leads: fill(LEAD_STATUSES, leads), vehicles: fill(VEHICLE_STATUSES, vehicles) };
  }
}
