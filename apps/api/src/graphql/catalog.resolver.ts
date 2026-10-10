import { NotFoundException, ParseUUIDPipe } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { Public } from '../common/decorators';
import { CatalogQuery } from '../search/catalog-query.dto';
import { CatalogService } from '../search/catalog.service';
import { CatalogFilterInput } from './inputs';
import { Vehicle, VehiclePage } from './models';

const DEFAULT_LIMIT = 20;

/** Read-only and public, like the REST catalog. It calls the same CatalogService. */
@Public()
@Resolver()
export class CatalogResolver {
  constructor(private readonly catalog: CatalogService) {}

  @Query(() => VehiclePage, {
    description: 'Search published vehicles (filters, full-text, sorting, pagination)',
    // Cost = page size x cost of what is selected per vehicle (child complexity).
    complexity: ({ args, childComplexity }) =>
      1 +
      ((args as { filter?: CatalogFilterInput }).filter?.limit ?? DEFAULT_LIMIT) * childComplexity,
  })
  vehicles(
    @Args('filter', { type: () => CatalogFilterInput, nullable: true })
    filter?: CatalogFilterInput,
  ): Promise<VehiclePage> {
    return this.catalog.search(toCatalogQuery(filter));
  }

  @Query(() => Vehicle, { nullable: true, description: 'One published vehicle, or null' })
  async vehicle(
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
  ): Promise<Vehicle | null> {
    try {
      return await this.catalog.findPublished(id);
    } catch (e) {
      if (e instanceof NotFoundException) return null;
      throw e;
    }
  }
}

/** GraphQL allows explicit nulls; the service treats `undefined` as "not set". */
function toCatalogQuery(filter: CatalogFilterInput = {}): CatalogQuery {
  const defined = Object.fromEntries(
    Object.entries(filter).filter(([, value]) => value !== null && value !== undefined),
  );
  return Object.assign(new CatalogQuery(), defined);
}
