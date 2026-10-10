import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators';

@Public()
@ApiTags('Health')
@Controller('health')
export class HealthController {
  @ApiOperation({ summary: 'Liveness check' })
  @Get()
  check(): { status: 'ok'; uptime: number } {
    return { status: 'ok', uptime: process.uptime() };
  }
}
