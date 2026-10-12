import { vehicle } from '@/test/fixtures';
import { buildVehicleJsonLd, serializeJsonLd } from './vehicle-jsonld';

describe('buildVehicleJsonLd', () => {
  it('maps the vehicle to a Car with an EUR offer from integer cents', () => {
    const ld = buildVehicleJsonLd(vehicle({ priceCents: 1500005, mileage: 60000, year: 2019 }));
    expect(ld).toMatchObject({
      '@type': 'Car',
      name: '2019 Volkswagen Golf 2.0 TDI',
      vehicleIdentificationNumber: 'WVWZZZ1JZXW000001',
      vehicleModelDate: '2019',
      fuelType: 'DIESEL',
      mileageFromOdometer: { value: 60000, unitCode: 'KMT' },
      offers: {
        price: '15000.05',
        priceCurrency: 'EUR',
        availability: 'https://schema.org/InStock',
      },
    });
  });

  it('makes image URLs absolute and maps status to availability', () => {
    const ld = buildVehicleJsonLd(vehicle({ status: 'SOLD' }));
    expect(ld.offers.availability).toBe('https://schema.org/SoldOut');
    for (const url of ld.image) expect(url).toMatch(/^https?:\/\//);
  });
});

describe('serializeJsonLd', () => {
  it('escapes < so text cannot close the script tag', () => {
    const out = serializeJsonLd(buildVehicleJsonLd(vehicle({ description: '</script><b>x' })));
    expect(out).not.toContain('<');
    expect(JSON.parse(out).description).toBe('</script><b>x');
  });
});
