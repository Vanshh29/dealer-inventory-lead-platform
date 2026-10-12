import { CATALOG, generateLeads, generateVehicles } from './seed-data';

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

describe('vehicle realism', () => {
  const { vehicles } = generateVehicles(500);
  const specs = Object.entries(CATALOG).flatMap(([make, models]) =>
    models.map((m) => [make, m] as const),
  );
  const specOf = (make: string, model: string) =>
    specs.find(([a, m]) => a === make && m.model === model)![1];

  it('gives every variant the fuel its name promises', () => {
    const fuelOf = (make: string, model: string, variant: string) =>
      specOf(make, model).variants.find((x) => x.name === variant)?.fuel;
    expect(fuelOf('Opel', 'Astra', '1.5 D Business')).toBe('DIESEL');
    expect(fuelOf('BMW', 'X3', 'xDrive30e')).toBe('PLUGIN_HYBRID');
    expect(fuelOf('Volkswagen', 'Golf', 'GTI')).toBe('PETROL');
    expect(fuelOf('Renault', 'Zoe', 'R135 Experience')).toBe('ELECTRIC');
    expect(specOf('Tesla', 'Model 3').variants.every((x) => x.fuel === 'ELECTRIC')).toBe(true);
    for (const v of vehicles) {
      expect(fuelOf(v.make, v.model, v.variant as string)).toBe(v.fuel);
    }
  });

  it('prices cars plausibly for their age', () => {
    for (const v of vehicles) {
      const newPrice = specOf(v.make, v.model).newPrice * 100;
      const age = 2026 - v.year;
      expect(v.priceCents).toBeLessThanOrEqual(newPrice * 1.1);
      expect(v.priceCents).toBeGreaterThanOrEqual(newPrice * 0.2);
      if (age <= 3) expect(v.priceCents).toBeGreaterThanOrEqual(newPrice * 0.55);
    }
  });

  it('never dates a variant before its powertrain existed', () => {
    for (const v of vehicles) {
      const variant = specOf(v.make, v.model).variants.find((x) => x.name === v.variant)!;
      expect(v.year).toBeGreaterThanOrEqual(variant.from ?? 0);
    }
  });
});

describe('demo lead generator', () => {
  const { vehicles } = generateVehicles(240);
  const now = new Date('2026-10-12T12:00:00Z');
  const { leads, notes } = generateLeads(vehicles, 40, 'sales-user-id', now);

  it('only targets published vehicles and is deterministic', () => {
    const published = new Set(vehicles.filter((v) => v.status === 'PUBLISHED').map((v) => v.id));
    expect(leads.every((l) => published.has(l.vehicleId as string))).toBe(true);
    expect(generateLeads(vehicles, 40, 'sales-user-id', now).leads).toEqual(leads);
  });

  it('spreads leads over the pipeline and only assigns/annotates leads that were worked on', () => {
    expect(new Set(leads.map((l) => l.status)).size).toBeGreaterThan(3);
    expect(leads.filter((l) => l.status === 'NEW').every((l) => l.assignedToId === null)).toBe(
      true,
    );
    expect(notes).toHaveLength(leads.filter((l) => l.status !== 'NEW').length);
  });

  it('records source and consent, and a plausible first response for worked leads', () => {
    expect(new Set(leads.map((l) => l.source)).size).toBeGreaterThan(1);
    for (const l of leads) {
      expect(l.consentAt).toEqual(l.createdAt);
      const created = (l.createdAt as Date).getTime();
      if (l.status === 'NEW') {
        expect(l.firstRespondedAt).toBeNull();
      } else {
        const responded = (l.firstRespondedAt as Date).getTime();
        expect(responded).toBeGreaterThan(created);
        expect(responded).toBeLessThanOrEqual(now.getTime());
        expect(responded - created).toBeLessThanOrEqual(30 * 3_600_000);
      }
    }
  });
});
