import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/lib/api';
import { LoginForm, safeNext } from './login-form';

const replace = jest.fn();
let nextParam: string | null = null;
const login = jest.fn();
let sessionStatus = 'anonymous';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(nextParam ? { next: nextParam } : {}),
}));
jest.mock('@/lib/session', () => ({
  useSession: () => ({ session: { status: sessionStatus }, login }),
}));

beforeEach(() => {
  replace.mockReset();
  login.mockReset();
  nextParam = null;
  sessionStatus = 'anonymous';
});

const submit = async (email = 'admin@carvio.test', pw = 'secret-pass') => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Email'), email);
  await user.type(screen.getByLabelText('Password'), pw);
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
};

describe('LoginForm', () => {
  it('logs in and goes to the back office', async () => {
    login.mockResolvedValue({ id: '1', email: 'admin@carvio.test', role: 'ADMIN' });
    render(<LoginForm />);
    await submit();
    expect(login).toHaveBeenCalledWith('admin@carvio.test', 'secret-pass');
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/admin'));
  });

  it('returns to the page the user came from', async () => {
    nextParam = '/admin/leads?status=NEW';
    login.mockResolvedValue({});
    render(<LoginForm />);
    await submit();
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/admin/leads?status=NEW'));
  });

  it('shows one generic message for wrong credentials and stays on the page', async () => {
    login.mockRejectedValue(
      new ApiError(401, { statusCode: 401, error: 'Unauthorized', message: 'Invalid credentials' }),
    );
    render(<LoginForm />);
    await submit('x@y.de', 'wrong');
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.');
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  });

  it('tells the user when they are rate limited', async () => {
    login.mockRejectedValue(new ApiError(429, null));
    render(<LoginForm />);
    await submit();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Too many attempts. Please wait a minute and try again.',
    );
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  });

  it('skips the form when already signed in', () => {
    sessionStatus = 'authenticated';
    render(<LoginForm />);
    expect(replace).toHaveBeenCalledWith('/admin');
  });
});

describe('safeNext (no open redirects)', () => {
  it.each([
    ['/admin', '/admin'],
    ['/admin/leads?status=NEW', '/admin/leads?status=NEW'],
    ['/admin/vehicles/abc', '/admin/vehicles/abc'],
    [null, '/admin'],
    ['https://evil.example', '/admin'],
    ['//evil.example', '/admin'],
    ['/administrator', '/admin'],
    ['/vehicles', '/admin'],
  ])('%s -> %s', (input, expected) => expect(safeNext(input)).toBe(expected));
});
