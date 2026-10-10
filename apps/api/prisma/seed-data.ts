import { createHash } from 'node:crypto';
import { FuelType, Gearbox, Prisma, VehicleStatus } from '@prisma/client';

interface ModelSpec {
  model: string;
  variants: string[];
  fuels: FuelType[];
  /** Approximate new price in EUR, used to derive a plausible used price. */
  newPrice: number;
  since: number;
}

const CATALOG: Record<string, ModelSpec[]> = {
  Volkswagen: [
    {
      model: 'Golf',
      variants: ['1.5 TSI Life', '2.0 TDI Style', 'GTI', '1.0 eTSI Active'],
      fuels: ['PETROL', 'DIESEL', 'HYBRID'],
      newPrice: 32000,
      since: 2012,
    },
    {
      model: 'Passat',
      variants: ['2.0 TDI Business', '1.5 TSI Elegance', 'GTE'],
      fuels: ['DIESEL', 'PETROL', 'PLUGIN_HYBRID'],
      newPrice: 42000,
      since: 2012,
    },
    {
      model: 'Tiguan',
      variants: ['2.0 TDI R-Line', '1.5 TSI Life'],
      fuels: ['DIESEL', 'PETROL'],
      newPrice: 40000,
      since: 2013,
    },
    {
      model: 'ID.3',
      variants: ['Pro', 'Pro S'],
      fuels: ['ELECTRIC'],
      newPrice: 40000,
      since: 2020,
    },
  ],
  BMW: [
    {
      model: '320d',
      variants: ['Touring', 'M Sport', 'Advantage'],
      fuels: ['DIESEL'],
      newPrice: 46000,
      since: 2012,
    },
    {
      model: 'X3',
      variants: ['xDrive20d', 'xDrive30e'],
      fuels: ['DIESEL', 'PLUGIN_HYBRID'],
      newPrice: 58000,
      since: 2013,
    },
    { model: 'i4', variants: ['eDrive40'], fuels: ['ELECTRIC'], newPrice: 65000, since: 2021 },
  ],
  'Mercedes-Benz': [
    {
      model: 'C 220 d',
      variants: ['Avantgarde', 'AMG Line'],
      fuels: ['DIESEL'],
      newPrice: 48000,
      since: 2012,
    },
    {
      model: 'A 180',
      variants: ['Style', 'Progressive'],
      fuels: ['PETROL'],
      newPrice: 34000,
      since: 2013,
    },
    {
      model: 'GLC 300',
      variants: ['4MATIC'],
      fuels: ['PETROL', 'PLUGIN_HYBRID'],
      newPrice: 60000,
      since: 2016,
    },
  ],
  Audi: [
    {
      model: 'A3',
      variants: ['Sportback 35 TFSI', '30 TDI'],
      fuels: ['PETROL', 'DIESEL'],
      newPrice: 34000,
      since: 2012,
    },
    {
      model: 'A4',
      variants: ['Avant 40 TDI', '45 TFSI quattro'],
      fuels: ['DIESEL', 'PETROL'],
      newPrice: 46000,
      since: 2012,
    },
    {
      model: 'Q3',
      variants: ['35 TFSI', '35 TDI'],
      fuels: ['PETROL', 'DIESEL'],
      newPrice: 40000,
      since: 2012,
    },
    {
      model: 'e-tron',
      variants: ['50 quattro'],
      fuels: ['ELECTRIC'],
      newPrice: 70000,
      since: 2019,
    },
  ],
  Opel: [
    {
      model: 'Corsa',
      variants: ['1.2 Edition', 'GS Line', 'Corsa-e'],
      fuels: ['PETROL', 'ELECTRIC'],
      newPrice: 20000,
      since: 2012,
    },
    {
      model: 'Astra',
      variants: ['1.4 Turbo Elegance', '1.5 D Business'],
      fuels: ['PETROL', 'DIESEL'],
      newPrice: 26000,
      since: 2012,
    },
  ],
  Skoda: [
    {
      model: 'Octavia',
      variants: ['Combi 2.0 TDI Style', '1.5 TSI Ambition'],
      fuels: ['DIESEL', 'PETROL'],
      newPrice: 31000,
      since: 2012,
    },
    {
      model: 'Fabia',
      variants: ['1.0 TSI Cool Plus'],
      fuels: ['PETROL'],
      newPrice: 19000,
      since: 2012,
    },
    { model: 'Enyaq', variants: ['iV 80'], fuels: ['ELECTRIC'], newPrice: 50000, since: 2021 },
  ],
  Ford: [
    {
      model: 'Focus',
      variants: ['1.0 EcoBoost Titanium', '1.5 TDCi'],
      fuels: ['PETROL', 'DIESEL'],
      newPrice: 25000,
      since: 2012,
    },
    {
      model: 'Kuga',
      variants: ['2.5 Hybrid ST-Line', '1.5 EcoBoost'],
      fuels: ['HYBRID', 'PETROL'],
      newPrice: 38000,
      since: 2013,
    },
  ],
  Toyota: [
    {
      model: 'Yaris',
      variants: ['Hybrid Comfort', '1.5 VVT-i'],
      fuels: ['HYBRID', 'PETROL'],
      newPrice: 22000,
      since: 2012,
    },
    {
      model: 'Corolla',
      variants: ['2.0 Hybrid Touring Sports', '1.8 Hybrid'],
      fuels: ['HYBRID'],
      newPrice: 31000,
      since: 2019,
    },
  ],
  Renault: [
    {
      model: 'Clio',
      variants: ['TCe 90 Intens', 'E-Tech Hybrid'],
      fuels: ['PETROL', 'HYBRID'],
      newPrice: 20000,
      since: 2012,
    },
    {
      model: 'Zoe',
      variants: ['R135 Experience'],
      fuels: ['ELECTRIC'],
      newPrice: 34000,
      since: 2013,
    },
  ],
  Tesla: [
    {
      model: 'Model 3',
      variants: ['Long Range', 'Standard Range Plus', 'Performance'],
      fuels: ['ELECTRIC'],
      newPrice: 50000,
      since: 2019,
    },
  ],
  Hyundai: [
    {
      model: 'i30',
      variants: ['1.0 T-GDI Trend', '1.6 CRDi'],
      fuels: ['PETROL', 'DIESEL'],
      newPrice: 24000,
      since: 2012,
    },
    { model: 'Ioniq 5', variants: ['72.6 kWh'], fuels: ['ELECTRIC'], newPrice: 50000, since: 2021 },
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
    const year = Math.min(
      referenceYear,
      spec.since + Math.floor(rand() * (referenceYear - spec.since + 1)),
    );
    const age = referenceYear - year;
    const fuel = pick(spec.fuels);
    const mileage = Math.round((age * 14000 + rand() * 25000) / 100) * 100;

    // Straight-line-ish depreciation: ~12 %/year, plus a little for mileage, with noise.
    const factor =
      Math.max(0.12, Math.pow(0.88, age)) *
      (1 - Math.min(0.25, mileage / 900000)) *
      (0.93 + rand() * 0.14);
    const priceCents = Math.round((spec.newPrice * factor) / 50) * 50 * 100;

    const gearbox: Gearbox = fuel === 'ELECTRIC' || rand() < 0.45 ? 'AUTOMATIC' : 'MANUAL';
    const r = rand();
    const status: VehicleStatus =
      r < 0.7 ? 'PUBLISHED' : r < 0.8 ? 'DRAFT' : r < 0.9 ? 'RESERVED' : 'SOLD';
    const variant = pick(spec.variants);
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
