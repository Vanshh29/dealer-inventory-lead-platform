import { createHash } from 'node:crypto';
import { FuelType, Gearbox, Prisma, VehicleStatus } from '@prisma/client';

interface VariantSpec {
  name: string;
  fuel: FuelType;
  /** First model year of this powertrain, when later than the model's own `since`. */
  from?: number;
}

interface ModelSpec {
  model: string;
  variants: VariantSpec[];
  /** Approximate new price in EUR, used to derive a plausible used price. */
  newPrice: number;
  since: number;
}

const v = (name: string, fuel: FuelType, from?: number): VariantSpec => ({ name, fuel, from });

// The fuel belongs to the variant (a "1.5 D" is a diesel, an "e-tron" is electric), never random.
export const CATALOG: Record<string, ModelSpec[]> = {
  Volkswagen: [
    {
      model: 'Golf',
      variants: [
        v('1.5 TSI Life', 'PETROL', 2017),
        v('2.0 TDI Style', 'DIESEL'),
        v('GTI', 'PETROL'),
        v('1.0 eTSI Active', 'HYBRID', 2020),
      ],
      newPrice: 32000,
      since: 2012,
    },
    {
      model: 'Passat',
      variants: [
        v('2.0 TDI Business', 'DIESEL'),
        v('1.5 TSI Elegance', 'PETROL', 2018),
        v('GTE', 'PLUGIN_HYBRID', 2015),
      ],
      newPrice: 42000,
      since: 2012,
    },
    {
      model: 'Tiguan',
      variants: [v('2.0 TDI R-Line', 'DIESEL'), v('1.5 TSI Life', 'PETROL', 2018)],
      newPrice: 40000,
      since: 2013,
    },
    {
      model: 'ID.3',
      variants: [v('Pro', 'ELECTRIC'), v('Pro S', 'ELECTRIC')],
      newPrice: 40000,
      since: 2020,
    },
  ],
  BMW: [
    {
      model: '320d',
      variants: [v('Touring', 'DIESEL'), v('M Sport', 'DIESEL'), v('Advantage', 'DIESEL')],
      newPrice: 46000,
      since: 2012,
    },
    {
      model: 'X3',
      variants: [v('xDrive20d', 'DIESEL'), v('xDrive30e', 'PLUGIN_HYBRID', 2020)],
      newPrice: 58000,
      since: 2013,
    },
    { model: 'i4', variants: [v('eDrive40', 'ELECTRIC')], newPrice: 65000, since: 2021 },
  ],
  'Mercedes-Benz': [
    {
      model: 'C 220 d',
      variants: [v('Avantgarde', 'DIESEL'), v('AMG Line', 'DIESEL')],
      newPrice: 48000,
      since: 2012,
    },
    {
      model: 'A 180',
      variants: [v('Style', 'PETROL'), v('Progressive', 'PETROL')],
      newPrice: 34000,
      since: 2013,
    },
    {
      model: 'GLC 300',
      variants: [v('4MATIC', 'PETROL'), v('e 4MATIC', 'PLUGIN_HYBRID', 2020)],
      newPrice: 60000,
      since: 2016,
    },
  ],
  Audi: [
    {
      model: 'A3',
      variants: [v('Sportback 35 TFSI', 'PETROL'), v('30 TDI', 'DIESEL')],
      newPrice: 34000,
      since: 2012,
    },
    {
      model: 'A4',
      variants: [v('Avant 40 TDI', 'DIESEL'), v('45 TFSI quattro', 'PETROL')],
      newPrice: 46000,
      since: 2012,
    },
    {
      model: 'Q3',
      variants: [v('35 TFSI', 'PETROL'), v('35 TDI', 'DIESEL')],
      newPrice: 40000,
      since: 2012,
    },
    { model: 'e-tron', variants: [v('50 quattro', 'ELECTRIC')], newPrice: 70000, since: 2019 },
  ],
  Opel: [
    {
      model: 'Corsa',
      variants: [
        v('1.2 Edition', 'PETROL'),
        v('GS Line', 'PETROL'),
        v('Corsa-e', 'ELECTRIC', 2020),
      ],
      newPrice: 20000,
      since: 2012,
    },
    {
      model: 'Astra',
      variants: [v('1.4 Turbo Elegance', 'PETROL'), v('1.5 D Business', 'DIESEL', 2019)],
      newPrice: 26000,
      since: 2012,
    },
  ],
  Skoda: [
    {
      model: 'Octavia',
      variants: [v('Combi 2.0 TDI Style', 'DIESEL'), v('1.5 TSI Ambition', 'PETROL', 2018)],
      newPrice: 31000,
      since: 2012,
    },
    { model: 'Fabia', variants: [v('1.0 TSI Cool Plus', 'PETROL')], newPrice: 20000, since: 2012 },
    { model: 'Enyaq', variants: [v('iV 80', 'ELECTRIC')], newPrice: 50000, since: 2021 },
  ],
  Ford: [
    {
      model: 'Focus',
      variants: [v('1.0 EcoBoost Titanium', 'PETROL'), v('1.5 TDCi', 'DIESEL')],
      newPrice: 25000,
      since: 2012,
    },
    {
      model: 'Kuga',
      variants: [v('2.5 Hybrid ST-Line', 'HYBRID', 2020), v('1.5 EcoBoost', 'PETROL')],
      newPrice: 38000,
      since: 2013,
    },
  ],
  Toyota: [
    {
      model: 'Yaris',
      variants: [v('Hybrid Comfort', 'HYBRID'), v('1.5 VVT-i', 'PETROL')],
      newPrice: 22000,
      since: 2012,
    },
    {
      model: 'Corolla',
      variants: [v('2.0 Hybrid Touring Sports', 'HYBRID'), v('1.8 Hybrid', 'HYBRID')],
      newPrice: 31000,
      since: 2019,
    },
  ],
  Renault: [
    {
      model: 'Clio',
      variants: [v('TCe 90 Intens', 'PETROL'), v('E-Tech Hybrid', 'HYBRID', 2020)],
      newPrice: 20000,
      since: 2012,
    },
    { model: 'Zoe', variants: [v('R135 Experience', 'ELECTRIC')], newPrice: 34000, since: 2013 },
  ],
  Tesla: [
    {
      model: 'Model 3',
      variants: [
        v('Long Range', 'ELECTRIC'),
        v('Standard Range Plus', 'ELECTRIC'),
        v('Performance', 'ELECTRIC'),
      ],
      newPrice: 50000,
      since: 2019,
    },
  ],
  Hyundai: [
    {
      model: 'i30',
      variants: [v('1.0 T-GDI Trend', 'PETROL'), v('1.6 CRDi', 'DIESEL')],
      newPrice: 24000,
      since: 2012,
    },
    { model: 'Ioniq 5', variants: [v('72.6 kWh', 'ELECTRIC')], newPrice: 50000, since: 2021 },
  ],
};

const COLORS = ['Black', 'White', 'Silver', 'Grey', 'Blue', 'Red', 'Green', 'Brown', 'Orange'];
const EQUIPMENT = [
  'navigation system',
  'heated seats',
  'adaptive cruise control',
  'LED headlights',
  'rear-view camera',
  'parking sensors',
  'Apple CarPlay and Android Auto',
  'panoramic roof',
  'leather upholstery',
  'tow bar',
  'keyless entry',
  'lane assist',
  'heated steering wheel',
  'alloy wheels',
];
const OPENERS = [
  'One owner, full service history.',
  'Garage kept and non-smoker vehicle.',
  'Regularly serviced at an authorised dealer.',
  'Well maintained and ready to drive.',
  'Recent inspection (TÜV) passed without remarks.',
  'Accident-free according to previous owner.',
];

/** Small deterministic PRNG so the seed is reproducible. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const VIN_CHARS = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';

/** Deterministic, valid-format VIN (not a real, checksum-valid one). */
export function vinFor(index: number): string {
  const h = createHash('sha1').update(`vin-${index}`).digest();
  return Array.from({ length: 17 }, (_, i) => VIN_CHARS[h[i] % VIN_CHARS.length]).join('');
}

/** Stable UUID derived from the VIN, so re-running the seed is idempotent (vehicles and images). */
export function uuidFor(seed: string): string {
  const h = createHash('sha1').update(seed).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

export function generateVehicles(count: number, referenceYear = 2026) {
  const rand = mulberry32(42);
  const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
  const makes = Object.keys(CATALOG);

  const vehicles: Prisma.VehicleCreateManyInput[] = [];
  const images: Prisma.VehicleImageCreateManyInput[] = [];

  for (let i = 0; i < count; i++) {
    const make = pick(makes);
    const spec = pick(CATALOG[make]);
    const variantSpec = pick(spec.variants);
    const first = Math.max(spec.since, variantSpec.from ?? 0);
    const year = Math.min(referenceYear, first + Math.floor(rand() * (referenceYear - first + 1)));
    const age = referenceYear - year;
    const fuel = variantSpec.fuel;
    const mileage = Math.round((age * 14000 + rand() * 25000) / 100) * 100;

    // ~10 %/year depreciation with a floor (old cars keep value), a modest mileage penalty and noise.
    const factor =
      Math.max(0.25, Math.pow(0.9, age)) *
      (1 - Math.min(0.15, mileage / 1_500_000)) *
      (0.93 + rand() * 0.14);
    const priceCents = Math.round((spec.newPrice * factor) / 50) * 50 * 100;

    const gearbox: Gearbox = fuel === 'ELECTRIC' || rand() < 0.45 ? 'AUTOMATIC' : 'MANUAL';
    const r = rand();
    const status: VehicleStatus =
      r < 0.7 ? 'PUBLISHED' : r < 0.8 ? 'DRAFT' : r < 0.9 ? 'RESERVED' : 'SOLD';
    const variant = variantSpec.name;
    const features = [...EQUIPMENT].sort(() => rand() - 0.5).slice(0, 3 + Math.floor(rand() * 3));

    const vin = vinFor(i);
    const id = uuidFor(vin);
    vehicles.push({
      id,
      vin,
      make,
      model: spec.model,
      variant,
      year,
      mileage,
      priceCents,
      fuel,
      gearbox,
      color: pick(COLORS),
      status,
      description: `${pick(OPENERS)} ${make} ${spec.model} ${variant}, ${year}. Equipment: ${features.join(', ')}.`,
      createdAt: new Date(Date.UTC(2026, 0, 1) + Math.floor(rand() * 250) * 86_400_000),
    });
    for (let p = 0; p < 3; p++) {
      images.push({
        id: uuidFor(`${vin}-img-${p}`),
        vehicleId: id,
        key: `seed-${vin}-${p}`,
        // External placeholder service: the seed ships no binary assets.
        url: `https://placehold.co/800x600/png?text=${encodeURIComponent(`${make} ${spec.model}`)}+${p + 1}`,
        position: p,
      });
    }
  }
  return { vehicles, images };
}

const FIRST = [
  'Anna',
  'Ben',
  'Clara',
  'David',
  'Elif',
  'Felix',
  'Greta',
  'Hans',
  'Ines',
  'Jonas',
  'Katrin',
  'Lukas',
];
const LAST = [
  'Schmidt',
  'Weber',
  'Yilmaz',
  'Fischer',
  'Wagner',
  'Becker',
  'Hoffmann',
  'Koch',
  'Richter',
  'Klein',
];
const MESSAGES = [
  'Is this car still available? I would like to arrange a test drive.',
  'Could you send me the service history, please?',
  'Is the price negotiable? I could pick it up this weekend.',
  'Does the car come with winter tyres?',
  'I am interested in financing options for this vehicle.',
];

/** Demo leads for published vehicles, spread over the pipeline. Fake people, example.com addresses. */
export function generateLeads(
  vehicles: Prisma.VehicleCreateManyInput[],
  count: number,
  salesUserId: string,
  now: Date = new Date(),
) {
  const rand = mulberry32(7);
  const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
  const published = vehicles.filter((v) => v.status === 'PUBLISHED');
  const statuses = [
    'NEW',
    'NEW',
    'NEW',
    'CONTACTED',
    'CONTACTED',
    'TEST_DRIVE',
    'OFFER',
    'WON',
    'LOST',
  ] as const;

  // Mostly website enquiries, with some phone and marketplace leads for the source breakdown.
  const sources = [
    'WEB',
    'WEB',
    'WEB',
    'WEB',
    'WEB',
    'PHONE',
    'PHONE',
    'MARKETPLACE',
    'MARKETPLACE',
    'OTHER',
  ] as const;
  const leads: Prisma.LeadCreateManyInput[] = [];
  const notes: Prisma.LeadNoteCreateManyInput[] = [];
  for (let i = 0; i < count; i++) {
    const first = pick(FIRST);
    const last = pick(LAST);
    const status = pick([...statuses]);
    const id = uuidFor(`lead-${i}`);
    // Spread over the last 60 days so the 30-day response statistics have data.
    const createdAt = new Date(now.getTime() - Math.floor(rand() * 60 * 24) * 3_600_000);
    // 30 minutes to 30 hours to first response, never in the future.
    const respondedAt = new Date(
      Math.min(now.getTime(), createdAt.getTime() + (0.5 + rand() * 29.5) * 3_600_000),
    );
    leads.push({
      id,
      vehicleId: pick(published).id as string,
      name: `${first} ${last}`,
      email: `${first}.${last}${i}@example.com`.toLowerCase(),
      phone: rand() < 0.6 ? `+49 170 ${String(1000000 + Math.floor(rand() * 8999999))}` : null,
      message: pick(MESSAGES),
      status,
      assignedToId: status === 'NEW' ? null : salesUserId,
      source: pick([...sources]),
      consentAt: createdAt,
      firstRespondedAt: status === 'NEW' ? null : respondedAt,
      createdAt,
    });
    if (status !== 'NEW') {
      notes.push({
        id: uuidFor(`lead-${i}-note`),
        leadId: id,
        authorId: salesUserId,
        text: 'Called the customer and sent the details by email.',
      });
    }
  }
  return { leads, notes };
}
