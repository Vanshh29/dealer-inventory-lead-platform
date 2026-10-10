import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators';
import { PaginationQuery } from '../common/pagination';
import { CreateUserDto } from './dto';
import { UsersService } from './users.service';

/** User management is ADMIN-only. There is deliberately no public registration. */
@ApiTags('Users (ADMIN)')
@Controller('users')
@Roles('ADMIN')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @ApiOperation({ summary: 'Create a user (ADMIN; there is no public registration)' })
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto.email, dto.password, dto.role);
  }

  @ApiOperation({ summary: 'List users, paginated (ADMIN)' })
  @Get()
  list(@Query() q: PaginationQuery) {
    return this.users.list(q.page, q.limit);
  }
}
