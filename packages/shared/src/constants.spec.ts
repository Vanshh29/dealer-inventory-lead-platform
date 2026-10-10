import { formatEuro, ROLES } from './constants';

describe('shared constants', () => {
  it('defines the three roles', () => {
    expect(ROLES).toEqual(['ADMIN', 'SALES', 'VIEWER']);
  });

  it('formats integer cents as euros', () => {
    expect(formatEuro(1999900).replace(/\s/g, ' ')).toBe('19.999,00 €');
  });

  it('rejects non-integer prices', () => {
    expect(() => formatEuro(10.5)).toThrow();
  });
});
