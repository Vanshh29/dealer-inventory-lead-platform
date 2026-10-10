import { centsToEuroInput, eurosToCents } from './money';

describe('eurosToCents', () => {
  it.each([
    ['19999', 1999900],
    ['19999.5', 1999950],
    ['19999.50', 1999950],
    ['19.999,50', 1999950],
    ['0,99', 99],
    [' 1 500 € ', 150000],
    ['0', 0],
  ])('parses %s', (input, expected) => {
    expect(eurosToCents(input)).toBe(expected);
  });

  it.each(['', 'abc', '-5', '1.234', '19.999', '12,345', '1e5', '99999999999'])(
    'rejects %j',
    (input) => {
      expect(eurosToCents(input)).toBeNull();
    },
  );

  it('never goes through floating point (0.1 + 0.2 style traps)', () => {
    expect(eurosToCents('0.29')).toBe(29);
    expect(eurosToCents('1.15')).toBe(115);
    expect(eurosToCents('4.35')).toBe(435);
  });
});

describe('centsToEuroInput', () => {
  it('round-trips', () => {
    for (const cents of [0, 5, 99, 100, 1999950, 1500000]) {
      expect(eurosToCents(centsToEuroInput(cents))).toBe(cents);
    }
    expect(centsToEuroInput(1500000)).toBe('15000');
    expect(centsToEuroInput(1999905)).toBe('19999.05');
  });
});
