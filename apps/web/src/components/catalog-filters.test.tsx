import { render, screen, within } from '@testing-library/react';
import type { Facets } from '@dealer/shared';
import { CatalogFilters } from './catalog-filters';

const facets: Facets = {
  makes: [
    { make: 'Audi', count: 2, models: [{ model: 'A3', count: 2 }] },
    {
      make: 'Volkswagen',
      count: 3,
      models: [
        { model: 'Golf', count: 2 },
        { model: 'Passat', count: 1 },
      ],
    },
  ],
};

describe('CatalogFilters', () => {
  it('is a GET search form so it works without JavaScript', () => {
    render(<CatalogFilters facets={facets} state={{}} />);
    const form = screen.getByRole('search', { name: 'Filter cars' });
    expect(form).toHaveAttribute('method', 'get');
    expect(form).toHaveAttribute('action', '/vehicles');
  });

  it('offers makes and models from the facets with counts, and every control has a label', () => {
    render(<CatalogFilters facets={facets} state={{}} />);
    const make = screen.getByLabelText('Make');
    expect(within(make).getByRole('option', { name: 'Volkswagen (3)' })).toBeInTheDocument();
    expect(
      within(screen.getByLabelText('Model')).getByRole('option', { name: 'Golf (2)' }),
    ).toBeInTheDocument();
    for (const label of [
      'Search',
      'Fuel',
      'Gearbox',
      'Min. price (€)',
      'Max. price (€)',
      'Year from',
      'Year to',
      'Max. mileage (km)',
      'Sort by',
    ]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
  });

  it('refills the form from the URL state and shows Reset only when filters are active', () => {
    const { rerender } = render(
      <CatalogFilters
        facets={facets}
        state={{ q: 'golf', make: 'Volkswagen', fuel: 'DIESEL', maxPrice: '20000' }}
      />,
    );
    expect(screen.getByLabelText('Search')).toHaveValue('golf');
    expect(screen.getByLabelText('Make')).toHaveValue('Volkswagen');
    expect(screen.getByLabelText('Fuel')).toHaveValue('DIESEL');
    expect(screen.getByLabelText('Max. price (€)')).toHaveValue('20000');
    expect(screen.getByRole('link', { name: 'Reset' })).toHaveAttribute('href', '/vehicles');
    rerender(<CatalogFilters facets={facets} state={{}} />);
    expect(screen.queryByRole('link', { name: 'Reset' })).not.toBeInTheDocument();
  });

  it('still works when facets could not be loaded', () => {
    render(<CatalogFilters facets={null} state={{}} />);
    expect(screen.getByLabelText('Make')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show results' })).toBeInTheDocument();
  });
});
