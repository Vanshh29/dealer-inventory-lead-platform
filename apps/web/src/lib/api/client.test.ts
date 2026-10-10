/** @jest-environment node */
import type { Vehicle } from '@dealer/shared';
import { createApiClient } from './client';

const vehicle: Vehicle = {
  id: 'v1',
  vin: 'WVWZZZ1JZXW000001',
  make: 'Volkswagen',
  model: 'Golf',
  variant: null,
  year: 2019,
  mileage: 60000,
  priceCents: 1500000,
  fuel: 'DIESEL',
  gearbox: 'MANUAL',
  color: 'Black',
  description: '',
  status: 'PUBLISHED',
  images: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function client(respond: (url: URL, init: RequestInit) => Response) {
  const calls: { url: URL; init: RequestInit }[] = [];
  const api = createApiClient({
    baseUrl: 'http://api.test',
    fetch: (async (url: string, init: RequestInit) => {
      const u = new URL(url);
      calls.push({ url: u, init });
      return respond(u, init);
    }) as unknown as typeof fetch,
  });
  return { api, calls };
}
const ok = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('api client', () => {
  it('catalog.search sends filters as query params and returns a typed page', async () => {
    const { api, calls } = client(() => ok({ items: [vehicle], page: 1, limit: 20, total: 1 }));
    const page = await api.catalog.search({
      q: 'golf',
      fuel: 'DIESEL',
      priceMax: 2000000,
      sort: 'price_asc',
      page: 1,
    });
    expect(page.items[0].priceCents).toBe(1500000);
    expect(calls[0].url.pathname).toBe('/vehicles');
    expect(Object.fromEntries(calls[0].url.searchParams)).toEqual({
      q: 'golf',
      fuel: 'DIESEL',
      priceMax: '2000000',
      sort: 'price_asc',
      page: '1',
    });
  });

  it('catalog.get fetches one vehicle', async () => {
    const { api, calls } = client(() => ok(vehicle));
    expect((await api.catalog.get('v1')).model).toBe('Golf');
    expect(calls[0].url.pathname).toBe('/vehicles/v1');
  });

  it('auth.login posts credentials and returns the user', async () => {
    const { api, calls } = client(() => ok({ id: 'u1', email: 'a@b.de', role: 'ADMIN' }));
    expect((await api.auth.login('a@b.de', 'pw')).role).toBe('ADMIN');
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ email: 'a@b.de', password: 'pw' });
  });

  it('leads.submit always sends the honeypot field empty', async () => {
    const { api, calls } = client(() => ok({ received: true }, 201));
    await api.leads.submit({ vehicleId: 'v1', name: 'A', email: 'a@b.de', message: 'hi' });
    expect(JSON.parse(calls[0].init.body as string)).toMatchObject({ website: '' });
  });

  it('admin.leads.changeStatus PATCHes the status and validates the lead', async () => {
    const lead = {
      id: 'l1',
      name: 'A',
      email: 'a@b.de',
      phone: null,
      message: 'm',
      status: 'CONTACTED',
      createdAt: 'x',
      updatedAt: 'x',
      vehicle: null,
      assignedTo: null,
      noteCount: 0,
      allowedTransitions: ['TEST_DRIVE', 'OFFER', 'LOST'],
    };
    const { api, calls } = client(() => ok(lead));
    const out = await api.admin.leads.changeStatus('l1', 'CONTACTED');
    expect(out.allowedTransitions).toContain('OFFER');
    expect(calls[0].init.method).toBe('PATCH');
    expect(calls[0].url.pathname).toBe('/admin/leads/l1/status');
  });

  it('admin.leads.assign can send null to unassign', async () => {
    const { api, calls } = client(() =>
      ok({
        id: 'l1',
        name: 'A',
        email: 'e',
        phone: null,
        message: 'm',
        status: 'NEW',
        createdAt: 'x',
        updatedAt: 'x',
        vehicle: null,
        assignedTo: null,
        noteCount: 0,
        allowedTransitions: ['CONTACTED', 'LOST'],
      }),
    );
    await api.admin.leads.assign('l1', null);
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ assignedToId: null });
  });

  it('admin.vehicles.uploadImage sends multipart with the file under "file"', async () => {
    const { api, calls } = client(() =>
      ok({ id: 'i1', vehicleId: 'v1', key: 'k.png', url: '/uploads/k.png', position: 0 }, 201),
    );
    await api.admin.vehicles.uploadImage('v1', new Blob(['x'], { type: 'image/png' }), 'car.png');
    const form = calls[0].init.body as FormData;
    expect(form).toBeInstanceOf(FormData);
    expect((form.get('file') as File).name).toBe('car.png');
  });

  it('admin.vehicles.remove handles 204', async () => {
    const { api } = client(() => new Response(null, { status: 204 }));
    await expect(api.admin.vehicles.remove('v1')).resolves.toBeUndefined();
  });

  it('fails loudly when the API returns the wrong shape', async () => {
    const { api } = client(() =>
      ok({ items: [{ ...vehicle, priceCents: 'cheap' }], page: 1, limit: 20, total: 1 }),
    );
    await expect(api.catalog.search()).rejects.toMatchObject({ name: 'ContractError' });
  });
});
