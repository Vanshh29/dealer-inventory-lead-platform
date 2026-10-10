import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthUser, CurrentUser, Public, Roles } from '../common/decorators';
import { PaginationQuery } from '../common/pagination';
import {
  AssignLeadDto,
  CreateLeadDto,
  CreateNoteDto,
  LeadListQuery,
  UpdateLeadStatusDto,
} from './dto';
import { LeadsService } from './leads.service';

// Evaluated per request so tests and operators can tune it through the environment.
const leadLimit = (): number => Number(process.env.LEAD_RATE_LIMIT ?? 5);

@ApiTags('Leads (public)')
@Controller('leads')
export class PublicLeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Public()
  @Throttle({ default: { limit: leadLimit, ttl: 60_000 } })
  @Post()
  @HttpCode(201)
  @ApiOperation({
    summary: 'Submit a lead for a published vehicle (rate-limited, honeypot-protected)',
  })
  async submit(@Body() dto: CreateLeadDto): Promise<{ received: true }> {
    await this.leads.submit(dto);
    return { received: true };
  }
}

/** Reading: any logged-in role (VIEWER is read-only). Changing: SALES and ADMIN. */
@ApiTags('Leads (back office)')
@ApiCookieAuth('access_token')
@Controller('admin/leads')
export class AdminLeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Get()
  @ApiOperation({
    summary: 'List leads, newest first (filter by status, assignee, vehicle, name/email)',
  })
  list(@Query() q: LeadListQuery) {
    return this.leads.list(q);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a lead, including its allowed next statuses' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.leads.get(id);
  }

  @Patch(':id/status')
  @Roles('SALES', 'ADMIN')
  @ApiOperation({
    summary: 'Change lead status; only valid transitions are accepted (SALES, ADMIN)',
  })
  changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeadStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.leads.changeStatus(id, dto.status, user.id);
  }

  @Patch(':id/assignment')
  @Roles('SALES', 'ADMIN')
  @ApiOperation({
    summary: 'Assign a lead to a SALES/ADMIN user, or unassign with null (SALES, ADMIN)',
  })
  assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignLeadDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.leads.assign(id, dto.assignedToId, user.id);
  }

  @Get(':id/notes')
  @ApiOperation({ summary: 'List notes of a lead, oldest first (paginated)' })
  notes(@Param('id', ParseUUIDPipe) id: string, @Query() q: PaginationQuery) {
    return this.leads.listNotes(id, q.page, q.limit);
  }

  @Post(':id/notes')
  @Roles('SALES', 'ADMIN')
  @ApiOperation({ summary: 'Add a note to a lead (SALES, ADMIN)' })
  addNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateNoteDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.leads.addNote(id, dto.text, user.id);
  }
}
