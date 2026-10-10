import { generateLeads, generateVehicles } from './seed-data';

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

describe('demo lead generator', () => {
  const { vehicles } = generateVehicles(240);
  const { leads, notes } = generateLeads(vehicles, 40, 'sales-user-id');

  it('only targets published vehicles and is deterministic', () => {
    const published = new Set(vehicles.filter((v) => v.status === 'PUBLISHED').map((v) => v.id));
    expect(leads.every((l) => published.has(l.vehicleId as string))).toBe(true);
    expect(generateLeads(vehicles, 40, 'sales-user-id').leads).toEqual(leads);
  });

  it('spreads leads over the pipeline and only assigns/annotates leads that were worked on', () => {
    expect(new Set(leads.map((l) => l.status)).size).toBeGreaterThan(3);
    expect(leads.filter((l) => l.status === 'NEW').every((l) => l.assignedToId === null)).toBe(
      true,
    );
    expect(notes).toHaveLength(leads.filter((l) => l.status !== 'NEW').length);
  });
});
