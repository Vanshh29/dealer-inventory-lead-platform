import { BadRequestException } from '@nestjs/common';
import { CatalogQuery } from './catalog-query.dto';
import { CatalogService } from './catalog.service';

describe('CatalogService range validation', () => {
  const service = new CatalogService({} as never);
  const search = (q: Partial<CatalogQuery>) => service.search({ page: 1, limit: 20, ...q });

  it('rejects an inverted price range with a clear message', async () => {
    const err = await search({ priceMin: 20000, priceMax: 10000 }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.message).toBe('priceMin must not exceed priceMax');
  });

  it('rejects an inverted year range', async () => {
    await expect(search({ yearMin: 2020, yearMax: 2015 })).rejects.toThrow(
      'yearMin must not exceed yearMax',
    );
  });
});
