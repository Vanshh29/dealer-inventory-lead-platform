import type { Lead, Vehicle } from '@dealer/shared';

export const vehicle = (o: Partial<Vehicle> = {}): Vehicle => ({
  id: '11111111-1111-4111-8111-111111111111',
  vin: 'WVWZZZ1JZXW000001',
  make: 'Volkswagen',
  model: 'Golf',
  variant: '2.0 TDI',
  year: 2019,
  mileage: 60000,
  priceCents: 1500000,
  fuel: 'DIESEL',
  gearbox: 'MANUAL',
  color: 'Black',
  description: 'Well kept.',
  status: 'PUBLISHED',
  images: [
    { id: 'i1', vehicleId: 'v', key: 'a.png', url: '/uploads/a.png', position: 0 },
    {
      id: 'i2',
      vehicleId: 'v',
      key: 'b.png',
      url: 'https://placehold.co/800x600/png',
      position: 1,
    },
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...o,
});

export const lead = (o: Partial<Lead> = {}): Lead => ({
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Erika Musterfrau',
  email: 'erika@example.com',
  phone: '+49 170 1234567',
  message: 'Still available?',
  status: 'NEW',
  createdAt: '2026-06-01T10:00:00.000Z',
  updatedAt: '2026-06-01T10:00:00.000Z',
  vehicle: {
    id: '11111111-1111-4111-8111-111111111111',
    make: 'Volkswagen',
    model: 'Golf',
    variant: null,
    year: 2019,
  },
  assignedTo: null,
  noteCount: 0,
  allowedTransitions: ['CONTACTED', 'LOST'],
  ...o,
});
