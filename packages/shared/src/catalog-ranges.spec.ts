import { invertedRanges } from './catalog-ranges';

describe('invertedRanges', () => {
  it('accepts open, equal and ordered ranges', () => {
    expect(invertedRanges({})).toEqual([]);
    expect(invertedRanges({ priceMin: 5 })).toEqual([]);
    expect(invertedRanges({ priceMin: 5, priceMax: 5, yearMin: 2010, yearMax: 2020 })).toEqual([]);
  });
  it('reports each inverted pair', () => {
    expect(invertedRanges({ priceMin: 10, priceMax: 5, yearMin: 2020, yearMax: 2010 })).toEqual([
      'priceMin must not exceed priceMax',
      'yearMin must not exceed yearMax',
    ]);
  });
});
