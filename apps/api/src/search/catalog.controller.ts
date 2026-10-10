import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators';
import { CatalogQuery } from './catalog-query.dto';
import { CatalogService } from './catalog.service';

@ApiTags('Catalog (public)')
@Public()
@Controller('vehicles')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  @ApiOperation({ summary: 'Search published vehicles (filters, full-text, sorting, pagination)' })
  search(@Query() query: CatalogQuery) {
    return this.catalog.search(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one published vehicle' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.findPublished(id);
  }
}
