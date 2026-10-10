import { render, screen } from '@testing-library/react';
import { vehicle } from '@/test/fixtures';
import { VehicleCard } from './vehicle-card';

describe('VehicleCard', () => {
  it('shows title, formatted price (from integer cents) and key specs, linking to the detail page', () => {
    render(
      <ul>
        <VehicleCard vehicle={vehicle()} />
      </ul>,
    );
    expect(screen.getByRole('heading', { name: 'Volkswagen Golf 2.0 TDI' })).toBeInTheDocument();
    expect(screen.getByText(/15\.000,00\s€/)).toBeInTheDocument();
    expect(screen.getByText(/2019 · 60\.000 km · Diesel · Manual/)).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/vehicles/11111111-1111-4111-8111-111111111111',
    );
  });

  it('uses the API origin for uploaded images, leaves absolute URLs alone and draws a car for placeholders', () => {
    const { rerender } = render(
      <ul>
        <VehicleCard vehicle={vehicle()} />
      </ul>,
    );
    expect(screen.getByRole('img')).toHaveAttribute(
      'src',
      expect.stringMatching(/^https?:\/\/.+\/uploads\/a\.png$/),
    );
    rerender(
      <ul>
        <VehicleCard
          vehicle={vehicle({
            images: [
              {
                id: 'x',
                vehicleId: 'v',
                key: 'k',
                url: 'https://cdn.example.com/1.png',
                position: 0,
              },
            ],
          })}
        />
      </ul>,
    );
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://cdn.example.com/1.png');
    rerender(
      <ul>
        <VehicleCard
          vehicle={vehicle({
            images: [
              { id: 'y', vehicleId: 'v', key: 'k', url: 'https://placehold.co/2.png', position: 0 },
            ],
          })}
        />
      </ul>,
    );
    expect(screen.getByRole('img').tagName).toBe('svg');
  });

  it('has a text fallback when there are no photos and describes images with alt text', () => {
    render(
      <ul>
        <VehicleCard vehicle={vehicle({ images: [] })} />
      </ul>,
    );
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('No photo yet')).toBeInTheDocument();
  });

  it('omits a missing variant cleanly', () => {
    render(
      <ul>
        <VehicleCard vehicle={vehicle({ variant: null })} />
      </ul>,
    );
    expect(screen.getByRole('heading', { name: 'Volkswagen Golf' })).toBeInTheDocument();
  });
});
