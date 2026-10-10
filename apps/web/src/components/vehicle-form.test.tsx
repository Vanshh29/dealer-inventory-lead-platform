import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { api, ApiError } from '@/lib/api';
import { vehicle } from '@/test/fixtures';
import { VehicleForm, toInput } from './vehicle-form';
import { checkImageFile } from './vehicle-images';

const push = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { admin: { vehicles: { create: jest.fn(), update: jest.fn() } } },
}));
const create = api.admin.vehicles.create as jest.Mock;
const update = api.admin.vehicles.update as jest.Mock;

beforeEach(() => {
  push.mockReset();
  create.mockReset();
  update.mockReset();
});

const valid = {
  vin: 'wvwzzz1jzxw000001',
  make: 'VW',
  model: 'Golf',
  variant: '',
  year: '2020',
  mileage: '45000',
  price: '19.999,90',
  fuel: 'DIESEL',
  gearbox: 'MANUAL',
  color: 'Blue',
  description: '',
  status: 'DRAFT',
};

describe('toInput', () => {
  it('converts euros to integer cents and normalises the VIN', () => {
    const r = toInput(valid);
    expect('input' in r && r.input).toMatchObject({
      vin: 'WVWZZZ1JZXW000001',
      priceCents: 1999990,
      year: 2020,
      mileage: 45000,
    });
  });

  it.each([
    ['vin', { vin: 'IOQ' }],
    ['make', { make: ' ' }],
    ['year', { year: '1800' }],
    ['mileage', { mileage: '-1' }],
    ['price', { price: '12.5.5' }],
    ['price', { price: '' }],
    ['color', { color: '' }],
  ])('flags invalid %s', (field, patch) => {
    const r = toInput({ ...valid, ...patch });
    expect('errors' in r && Object.keys(r.errors)).toContain(field);
  });
});

describe('VehicleForm', () => {
  it('shows existing values with the price in euros', () => {
    render(<VehicleForm vehicle={vehicle({ priceCents: 1999905 })} />);
    expect(screen.getByLabelText('Price (€)')).toHaveValue('19999.05');
    expect(screen.getByLabelText('VIN')).toHaveValue('WVWZZZ1JZXW000001');
  });

  it('validates before calling the API', async () => {
    render(<VehicleForm />);
    await userEvent.click(screen.getByRole('button', { name: 'Create vehicle' }));
    expect(screen.getByLabelText('VIN')).toHaveAccessibleDescription(/17 characters/);
    expect(create).not.toHaveBeenCalled();
  });

  it('updates with cents and shows a confirmation', async () => {
    update.mockResolvedValue(vehicle());
    const onSaved = jest.fn();
    render(<VehicleForm vehicle={vehicle()} onSaved={onSaved} />);
    const price = screen.getByLabelText('Price (€)');
    await userEvent.clear(price);
    await userEvent.type(price, '14.500,50');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update.mock.calls[0][1].priceCents).toBe(1450050);
    expect(await screen.findByRole('status')).toHaveTextContent('Saved.');
    expect(onSaved).toHaveBeenCalled();
  });

  it('lists the API validation messages, e.g. a duplicate VIN', async () => {
    update.mockRejectedValue(
      new ApiError(409, {
        statusCode: 409,
        error: 'Conflict',
        message: 'A vehicle with this VIN already exists',
      }),
    );
    render(<VehicleForm vehicle={vehicle()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A vehicle with this VIN already exists',
    );
  });

  it('goes to the new vehicle after creating', async () => {
    create.mockResolvedValue(vehicle({ id: 'new-id' }));
    render(<VehicleForm vehicle={undefined} />);
    for (const [label, value] of [
      ['VIN', 'WVWZZZ1JZXW000009'],
      ['Colour', 'Red'],
      ['Make', 'VW'],
      ['Model', 'Polo'],
      ['Mileage (km)', '1000'],
      ['Price (€)', '9999'],
    ]) {
      await userEvent.type(screen.getByLabelText(label), value);
    }
    await userEvent.click(screen.getByRole('button', { name: 'Create vehicle' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin/vehicles/new-id'));
  });

  it('is fully disabled and has no submit button for read-only roles', () => {
    render(<VehicleForm vehicle={vehicle()} readOnly />);
    expect(screen.queryByRole('button', { name: /Save/ })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Make')).toBeDisabled();
  });
});

describe('checkImageFile', () => {
  it('accepts JPEG/PNG/WebP up to 5 MB and rejects the rest', () => {
    expect(checkImageFile({ type: 'image/png', size: 1000 })).toBeNull();
    expect(checkImageFile({ type: 'image/gif', size: 1000 })).toMatch(/Only JPEG/);
    expect(checkImageFile({ type: 'image/jpeg', size: 5 * 1024 * 1024 + 1 })).toMatch(/5 MB/);
  });
});
