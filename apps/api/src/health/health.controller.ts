import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators';

@Public()
@Controller('health')
export class HealthController {
  @Get()
  check(): { status: 'ok'; uptime: number } {
    return { status: 'ok', uptime: process.uptime() };
  }
}
