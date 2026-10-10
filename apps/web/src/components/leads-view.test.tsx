import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { api, ApiError } from '@/lib/api';
import { lead } from '@/test/fixtures';
import { LeadsView } from './leads-view';

let search = '';
jest.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(search) }));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { admin: { leads: { list: jest.fn() } } },
}));
const list = api.admin.leads.list as jest.Mock;
const page = (items = [lead()], total = items.length) => ({ items, page: 1, limit: 20, total });

beforeEach(() => {
  search = '';
  list.mockReset();
});

describe('LeadsView', () => {
  it('shows a loading state, then the leads table', async () => {
    list.mockResolvedValue(
      page([
        lead(),
        lead({
          id: 'l2',
          name: 'Max Muster',
          status: 'CONTACTED',
          assignedTo: { id: 'u', email: 'sales@dealer.test', role: 'SALES' },
        }),
      ]),
    );
    render(<LeadsView />);
    expect(screen.getByRole('status', { name: 'Loading leads' })).toBeInTheDocument();

    const table = await screen.findByRole('table', { name: /Leads/ });
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(3); // header + 2
    expect(within(rows[1]).getByRole('link', { name: 'Erika Musterfrau' })).toHaveAttribute(
      'href',
      '/admin/leads/22222222-2222-4222-8222-222222222222',
    );
    expect(within(rows[1]).getByText('New')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Contacted')).toBeInTheDocument();
    expect(within(rows[2]).getByText('sales@dealer.test')).toBeInTheDocument();
    expect(screen.getByText('2 leads')).toBeInTheDocument();
  });

  it('passes URL filters to the API', async () => {
    search = 'status=OFFER&q=erika&page=2';
    list.mockResolvedValue(page());
    render(<LeadsView />);
    await screen.findByRole('table');
    expect(list).toHaveBeenCalledWith({ status: 'OFFER', q: 'erika', page: 2, limit: 20 });
  });

  it('ignores an invalid status in the URL', async () => {
    search = 'status=HACKED';
    list.mockResolvedValue(page());
    render(<LeadsView />);
    await screen.findByRole('table');
    expect(list.mock.calls[0][0].status).toBeUndefined();
  });

  it('marks the active status filter and links the others', async () => {
    search = 'status=NEW';
    list.mockResolvedValue(page());
    render(<LeadsView />);
    await screen.findByRole('table');
    const nav = screen.getByRole('navigation', { name: 'Filter by status' });
    expect(within(nav).getByRole('link', { name: 'New' })).toHaveAttribute('aria-current', 'true');
    expect(within(nav).getByRole('link', { name: 'Lost' })).toHaveAttribute(
      'href',
      '/admin/leads?status=LOST',
    );
  });

  it('explains an empty result differently with and without filters', async () => {
    list.mockResolvedValue(page([], 0));
    const { unmount } = render(<LeadsView />);
    expect(await screen.findByText('No leads found')).toBeInTheDocument();
    expect(screen.getByText(/New enquiries from the website/)).toBeInTheDocument();
    unmount();

    search = 'status=WON';
    render(<LeadsView />);
    expect(await screen.findByText(/Try another status/)).toBeInTheDocument();
  });

  it('shows an error with retry, and recovers', async () => {
    list.mockRejectedValueOnce(new ApiError(500, null)).mockResolvedValueOnce(page());
    render(<LeadsView />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/our side/);
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('table')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('shows leads whose vehicle was deleted', async () => {
    list.mockResolvedValue(page([lead({ vehicle: null })]));
    render(<LeadsView />);
    expect(await screen.findByText('Vehicle removed')).toBeInTheDocument();
  });

  it('paginates with links that keep the filters', async () => {
    search = 'status=NEW';
    list.mockResolvedValue({ items: [lead()], page: 1, limit: 20, total: 45 });
    render(<LeadsView />);
    await screen.findByRole('table');
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Next/ })).toHaveAttribute(
      'href',
      '/admin/leads?status=NEW&page=2',
    );
  });
});
