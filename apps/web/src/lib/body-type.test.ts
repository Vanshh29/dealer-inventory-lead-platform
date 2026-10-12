import { bodyTypeOf } from './body-type';

describe('bodyTypeOf', () => {
  it('maps known models to a silhouette', () => {
    expect(bodyTypeOf({ model: 'Tiguan' })).toBe('suv');
    expect(bodyTypeOf({ model: 'Passat' })).toBe('wagon');
    expect(bodyTypeOf({ model: 'Model 3' })).toBe('sedan');
    expect(bodyTypeOf({ model: 'Golf' })).toBe('hatch');
  });

  it('falls back to a hatchback for unknown models', () => {
    expect(bodyTypeOf({ model: 'Unknown' })).toBe('hatch');
    expect(bodyTypeOf({})).toBe('hatch');
  });

  it('lets an estate-style variant name win over the model', () => {
    expect(bodyTypeOf({ model: 'A4', variant: 'Avant Touring' })).toBe('wagon');
  });
});
