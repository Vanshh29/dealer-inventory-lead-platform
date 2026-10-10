import { generateVehicles } from './seed-data';

describe('seed data generator', () => {
  const { vehicles, images } = generateVehicles(240);

  it('creates the requested number of vehicles with unique, valid VINs', () => {
    expect(vehicles).toHaveLength(240);
    expect(new Set(vehicles.map((v) => v.vin)).size).toBe(240);
    expect(vehicles.every((v) => /^[A-HJ-NPR-Z0-9]{17}$/.test(v.vin))).toBe(true);
  });

  it('uses integer cents and plausible values', () => {
    for (const v of vehicles) {
      expect(Number.isInteger(v.priceCents)).toBe(true);
      expect(v.priceCents).toBeGreaterThan(100_000); // > 1000 EUR
      expect(v.mileage).toBeGreaterThanOrEqual(0);
      expect(v.year).toBeLessThanOrEqual(2026);
    }
  });

  it('is deterministic, so seeding twice is idempotent', () => {
    expect(generateVehicles(240).vehicles).toEqual(vehicles);
  });

  it('gives every vehicle three images with unique keys', () => {
    expect(images).toHaveLength(720);
    expect(new Set(images.map((i) => i.key)).size).toBe(720);
  });

  it('has a healthy share of published vehicles', () => {
    expect(vehicles.filter((v) => v.status === 'PUBLISHED').length).toBeGreaterThan(120);
  });
});
