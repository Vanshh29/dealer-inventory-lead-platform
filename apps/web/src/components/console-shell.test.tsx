import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConsoleShell } from './console-shell';

const replace = jest.fn();
const logout = jest.fn().mockResolvedValue(undefined);
const retry = jest.fn();
let session: object = { status: 'loading' };

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/admin/leads',
}));
jest.mock('@/lib/session', () => ({ useSession: () => ({ session, logout, retry }) }));

beforeEach(() => {
  replace.mockReset();
  logout.mockClear();
});

describe('ConsoleShell', () => {
  it('does not render the page while the session is loading', () => {
    session = { status: 'loading' };
    render(
      <ConsoleShell>
        <p>secret page</p>
      </ConsoleShell>,
    );
    expect(screen.queryByText('secret page')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('redirects anonymous visitors to login, remembering where they wanted to go', () => {
    session = { status: 'anonymous' };
    render(
      <ConsoleShell>
        <p>secret page</p>
      </ConsoleShell>,
    );
    expect(screen.queryByText('secret page')).not.toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith('/admin/login?next=%2Fadmin%2Fleads');
  });

  it('offers a retry when the session check itself failed', async () => {
    session = { status: 'error' };
    render(
      <ConsoleShell>
        <p>secret page</p>
      </ConsoleShell>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
  });

  it('shows navigation, the user and role, and marks the current page', async () => {
    session = {
      status: 'authenticated',
      user: { id: '1', email: 'sales@carvio.test', role: 'SALES' },
    };
    render(
      <ConsoleShell>
        <p>secret page</p>
      </ConsoleShell>,
    );
    expect(screen.getByText('secret page')).toBeInTheDocument();
    expect(screen.getByText('sales@carvio.test')).toBeInTheDocument();
    expect(screen.getByText('SALES')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Leads' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current');

    await userEvent.click(screen.getByRole('button', { name: 'Log out' }));
    expect(logout).toHaveBeenCalled();
  });
});
