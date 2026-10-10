import { toTsQuery } from './ts-query';

describe('toTsQuery', () => {
  it('builds an AND of prefix terms', () => {
    expect(toTsQuery('VW Gol')).toBe('vw:* & gol:*');
  });

  it('strips tsquery operators so they cannot be injected', () => {
    expect(toTsQuery("golf & | ! ( ) : * <-> '; DROP TABLE")).toBe('golf:* & drop:* & table:*');
  });

  it('keeps unicode letters', () => {
    expect(toTsQuery('Citroën Käfer')).toBe('citroën:* & käfer:*');
  });

  it('returns null when nothing searchable remains', () => {
    expect(toTsQuery('  &|!  ')).toBeNull();
    expect(toTsQuery('')).toBeNull();
  });

  it('caps the number and length of terms', () => {
    const q = toTsQuery(Array.from({ length: 20 }, (_, i) => `w${i}`).join(' '))!;
    expect(q.split(' & ')).toHaveLength(8);
    expect(toTsQuery('a'.repeat(100))).toBe(`${'a'.repeat(40)}:*`);
  });
});
