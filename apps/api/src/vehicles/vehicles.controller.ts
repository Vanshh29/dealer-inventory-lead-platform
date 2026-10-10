import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { VehicleStatus } from '@prisma/client';
import { AuthUser, CurrentUser, Roles } from '../common/decorators';
import { PaginationQuery } from '../common/pagination';
import { CreateVehicleDto, UpdateVehicleDto } from './dto';
import { VehiclesService } from './vehicles.service';

class AdminListQuery extends PaginationQuery {
  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;
}

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * Back-office vehicle management. Reading needs any logged-in role (VIEWER, SALES, ADMIN);
 * every write is ADMIN-only.
 */
@ApiTags('Vehicles (back office)')
@ApiCookieAuth('access_token')
@Controller('admin/vehicles')
export class VehiclesController {
  constructor(private readonly vehicles: VehiclesService) {}

  @Get()
  @ApiOperation({ summary: 'List vehicles of any status (paginated)' })
  list(@Query() q: AdminListQuery) {
    return this.vehicles.list(q.page, q.limit, q.status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a vehicle of any status' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.vehicles.get(id);
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a vehicle (ADMIN)' })
  create(@Body() dto: CreateVehicleDto, @CurrentUser() user: AuthUser) {
    return this.vehicles.create(dto, user.id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update a vehicle (ADMIN)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVehicleDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.vehicles.update(id, dto, user.id);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a vehicle and its images (ADMIN)' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.vehicles.remove(id, user.id);
  }

  @Post(':id/images')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Upload an image (JPEG/PNG/WebP, max 5 MB, max 10 per vehicle) (ADMIN)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_BYTES, files: 1 } }))
  addImage(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Multipart field "file" is required');
    return this.vehicles.addImage(id, file, user.id);
  }

  @Delete(':id/images/:imageId')
  @Roles('ADMIN')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete an image (ADMIN)' })
  removeImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.vehicles.removeImage(id, imageId, user.id);
  }
}
