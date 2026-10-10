import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../common/decorators';
import { PrismaService } from '../common/prisma.service';

@Public()
@SkipThrottle() // orchestrator probes must never be rate limited
@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @ApiOperation({ summary: 'Liveness: the process is up (does not touch the database)' })
  @Get()
  check(): { status: 'ok'; uptime: number } {
    return { status: 'ok', uptime: process.uptime() };
  }

  @ApiOperation({ summary: 'Readiness: the database answers. 503 when it does not' })
  @Get('ready')
  async ready(): Promise<{ status: 'ok' }> {
    try {
      await this.prisma.user.findFirst({ select: { id: true } });
      return { status: 'ok' };
    } catch {
      throw new ServiceUnavailableException('Database unavailable');
    }
  }
}
