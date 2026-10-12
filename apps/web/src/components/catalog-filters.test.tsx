import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Facets } from '@dealer/shared';
import { ActiveFilters, CatalogFilters } from './catalog-filters';

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

describe('ActiveFilters', () => {
  it('renders nothing without filters', () => {
    const { container } = render(<ActiveFilters state={{ sort: 'newest' }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('offers a link that removes just that filter and keeps the others', () => {
    render(<ActiveFilters state={{ fuel: 'DIESEL', maxKm: '50000', sort: 'newest' }} />);
    expect(screen.getByRole('link', { name: 'Remove filter: Diesel' })).toHaveAttribute(
      'href',
      '/vehicles?maxKm=50000&sort=newest',
    );
    expect(screen.getByRole('link', { name: 'Remove filter: Up to 50000 km' })).toHaveAttribute(
      'href',
      '/vehicles?fuel=DIESEL&sort=newest',
    );
  });
});

describe('CatalogFilters interactions', () => {
  it('narrows models to the selected make and clears a model that does not belong to it', async () => {
    const user = userEvent.setup();
    render(<CatalogFilters facets={facets} state={{ make: 'Volkswagen', model: 'Golf' }} />);
    const model = screen.getByLabelText('Model');
    expect(within(model).queryByRole('option', { name: 'A3 (2)' })).not.toBeInTheDocument();
    expect(model).toHaveValue('Golf');
    await user.selectOptions(screen.getByLabelText('Make'), 'Audi');
    expect(screen.getByLabelText('Model')).toHaveValue('');
    expect(within(model).getByRole('option', { name: 'A3 (2)' })).toBeInTheDocument();
    expect(within(model).queryByRole('option', { name: 'Golf (2)' })).not.toBeInTheDocument();
  });

  it('shows a hint and does not submit when min price exceeds max price', async () => {
    const user = userEvent.setup();
    const submit = jest.fn((e: Event) => e.preventDefault());
    render(<CatalogFilters facets={facets} state={{}} />);
    const form = screen.getByRole('search', { name: 'Filter cars' });
    form.addEventListener('submit', submit);
    await user.type(screen.getByLabelText('Min. price (€)'), '20000');
    await user.type(screen.getByLabelText('Max. price (€)'), '10000');
    expect(screen.getByRole('alert')).toHaveTextContent(/minimum price is higher/i);
    const event = new Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
});
