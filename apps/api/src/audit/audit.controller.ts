import { Controller, Get, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { Roles } from '../common/decorators';
import { PaginationQuery } from '../common/pagination';
import { AuditService } from './audit.service';

class AuditQuery extends PaginationQuery {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  entity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  entityId?: string;

  @IsOptional()
  @IsUUID()
  actorId?: string;
}

@ApiTags('Audit log (ADMIN)')
@ApiCookieAuth('access_token')
@Controller('admin/audit-logs')
@Roles('ADMIN')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'List audit entries, newest first (ADMIN)' })
  list(@Query() q: AuditQuery) {
    const { entity, entityId, actorId } = q;
    return this.audit.list({ entity, entityId, actorId }, q.page, q.limit);
  }
}
