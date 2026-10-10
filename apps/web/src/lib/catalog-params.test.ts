import { catalogHref, parseCatalogSearch } from './catalog-params';

describe('parseCatalogSearch', () => {
  it('maps valid input to API params (euros -> cents)', () => {
    const { params, page } = parseCatalogSearch({
      q: 'golf',
      fuel: 'DIESEL',
      gearbox: 'AUTOMATIC',
      maxPrice: '19.999,50',
      minYear: '2018',
      maxKm: '90000',
      sort: 'price_asc',
      page: '3',
      make: 'Volkswagen',
    });
    expect(params).toMatchObject({
      q: 'golf',
      fuel: 'DIESEL',
      gearbox: 'AUTOMATIC',
      priceMax: 1999950,
      yearMin: 2018,
      mileageMax: 90000,
      sort: 'price_asc',
      make: 'Volkswagen',
      page: 3,
      limit: 12,
    });
    expect(page).toBe(3);
  });

  it('drops invalid and hostile values instead of forwarding them', () => {
    const { params, state } = parseCatalogSearch({
      fuel: 'STEAM',
      sort: 'random',
      maxPrice: 'abc',
      minYear: '-5',
      maxKm: '1e9',
      page: '-1',
      q: '   ',
    });
    expect(params).toEqual({ limit: 12, page: 1 });
    expect(state).toEqual({});
  });

  it('uses the first value when a param is repeated', () => {
    expect(parseCatalogSearch({ make: ['Audi', 'BMW'] }).params.make).toBe('Audi');
  });

  it('swaps inverted ranges rather than producing an API error', () => {
    const { params } = parseCatalogSearch({
      minPrice: '20000',
      maxPrice: '10000',
      minYear: '2022',
      maxYear: '2018',
    });
    expect(params).toMatchObject({
      priceMin: 1000000,
      priceMax: 2000000,
      yearMin: 2018,
      yearMax: 2022,
    });
  });

  it('caps the free-text query length', () => {
    expect(parseCatalogSearch({ q: 'a'.repeat(300) }).params.q).toHaveLength(100);
  });
});

describe('catalogHref', () => {
  it('builds a clean URL and omits page 1', () => {
    expect(catalogHref({ q: 'golf', fuel: 'DIESEL' })).toBe('/vehicles?q=golf&fuel=DIESEL');
    expect(catalogHref({}, 1)).toBe('/vehicles');
    expect(catalogHref({ q: 'a b' }, 2)).toBe('/vehicles?q=a+b&page=2');
  });
});
