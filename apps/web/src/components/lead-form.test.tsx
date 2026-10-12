import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/lib/api';
import { api } from '@/lib/api';
import { LeadForm, readUtm, validateLead } from './lead-form';

jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { leads: { submit: jest.fn() } },
}));
const submit = api.leads.submit as jest.Mock;

const fill = async (
  user: ReturnType<typeof userEvent.setup>,
  o: { name?: string; email?: string; phone?: string; consent?: boolean } = {},
) => {
  await user.type(screen.getByLabelText('Name'), o.name ?? 'Erika Musterfrau');
  await user.type(screen.getByLabelText('Email'), o.email ?? 'erika@example.com');
  if (o.phone) await user.type(screen.getByLabelText(/Phone/), o.phone);
  if (o.consent !== false) await user.click(screen.getByLabelText(/I agree/));
};

beforeEach(() => submit.mockReset());

describe('LeadForm', () => {
  it('prefills the message with the vehicle', () => {
    render(<LeadForm vehicleId="v1" vehicleTitle="VW Golf" />);
    expect((screen.getByLabelText('Message') as HTMLTextAreaElement).value).toContain('VW Golf');
  });

  it('shows accessible field errors, focuses the first one, and does not call the API', async () => {
    const user = userEvent.setup();
    render(<LeadForm vehicleId="v1" vehicleTitle="VW Golf" />);
    await user.click(screen.getByRole('button', { name: 'Send request' }));

    const name = screen.getByLabelText('Name');
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveAccessibleDescription('Please enter your name.');
    expect(name).toHaveFocus();
    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription(
      'Please enter a valid email address.',
    );
    expect(submit).not.toHaveBeenCalled();
  });

  it('requires consent, shows a field error and does not call the API', async () => {
    const user = userEvent.setup();
    render(<LeadForm vehicleId="v1" vehicleTitle="VW Golf" />);
    await fill(user, { consent: false });
    await user.click(screen.getByRole('button', { name: 'Send request' }));

    const box = screen.getByLabelText(/I agree/);
    expect(box).toHaveAttribute('aria-invalid', 'true');
    expect(box).toHaveAccessibleDescription(/Please agree to the privacy notice/);
    expect(submit).not.toHaveBeenCalled();
  });

  it('shows the privacy notice, the reply promise and autocomplete hints', () => {
    render(<LeadForm vehicleId="v1" vehicleTitle="VW Golf" />);
    expect(screen.getByText(/Privacy notice:/)).toBeInTheDocument();
    expect(screen.getByText('We reply within one business day.')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveAttribute('autocomplete', 'name');
    expect(screen.getByLabelText('Email')).toHaveAttribute('autocomplete', 'email');
    expect(screen.getByLabelText(/Phone/)).toHaveAttribute('autocomplete', 'tel');
  });

  it('sends consent and the UTM parameters of the landing URL', async () => {
    submit.mockResolvedValue(undefined);
    window.history.replaceState(null, '', '/vehicles/v1?utm_source=google&utm_medium=cpc');
    const user = userEvent.setup();
    render(<LeadForm vehicleId="v1" vehicleTitle="VW Golf" />);
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Send request' }));
    await waitFor(() => expect(submit).toHaveBeenCalled());
    expect(submit.mock.calls[0][0]).toMatchObject({
      consent: true,
      utmSource: 'google',
      utmMedium: 'cpc',
      utmCampaign: undefined,
    });
    window.history.replaceState(null, '', '/');
  });

  it('submits trimmed data with an empty honeypot and shows a confirmation', async () => {
    submit.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<LeadForm vehicleId="v1" vehicleTitle="VW Golf" />);
    await fill(user, { name: '  Erika  ', email: ' erika@example.com ', phone: '+49 170 123456' });
    await user.click(screen.getByRole('button', { name: 'Send request' }));

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/Thank you/));
    expect(submit).toHaveBeenCalledWith(
      expect.objectContaining({
        vehicleId: 'v1',
        name: 'Erika',
        email: 'erika@example.com',
        phone: '+49 170 123456',
        website: '',
      }),
    );
  });

  it('omits the phone when empty', async () => {
    submit.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<LeadForm vehicleId="v1" vehicleTitle="VW Golf" />);
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Send request' }));
    await waitFor(() => expect(submit).toHaveBeenCalled());
    expect(submit.mock.calls[0][0].phone).toBeUndefined();
  });

  it('hides the honeypot from people and assistive tech but forwards what a bot types into it', async () => {
    submit.mockResolvedValue(undefined);
    const user = userEvent.setup();
    const { container } = render(<LeadForm vehicleId="v1" vehicleTitle="VW Golf" />);
    const trap = container.querySelector('input[name="website"]') as HTMLInputElement;
    expect(trap.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(trap).toHaveAttribute('tabindex', '-1');
    expect(screen.queryByRole('textbox', { name: 'Website' })).not.toBeInTheDocument();

    await fill(user);
    await user.type(trap, 'http://spam.example'); // a bot would do this
    await user.click(screen.getByRole('button', { name: 'Send request' }));
    await waitFor(() => expect(submit).toHaveBeenCalled());
    expect(submit.mock.calls[0][0].website).toBe('http://spam.example');
  });

  it('shows a readable message when the API fails, and lets the user retry', async () => {
    submit.mockRejectedValueOnce(
      new ApiError(429, {
        statusCode: 429,
        error: 'ThrottlerException',
        message: 'Too Many Requests',
      }),
    );
    const user = userEvent.setup();
    render(<LeadForm vehicleId="v1" vehicleTitle="VW Golf" />);
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Send request' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Too many requests/);
    expect(screen.getByRole('button', { name: 'Send request' })).toBeEnabled();
  });

  it('disables the button while sending (no double submits)', async () => {
    let resolve!: () => void;
    submit.mockReturnValue(new Promise<void>((r) => (resolve = r)));
    const user = userEvent.setup();
    render(<LeadForm vehicleId="v1" vehicleTitle="VW Golf" />);
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Send request' }));
    expect(screen.getByRole('button', { name: 'Sending…' })).toBeDisabled();
    resolve();
    await screen.findByRole('status');
  });
});

describe('validateLead', () => {
  const ok = { name: 'A', email: 'a@b.de', phone: '', message: 'hi', consent: true };
  it('accepts valid input', () => expect(validateLead(ok)).toEqual({}));
  it('requires consent', () =>
    expect(validateLead({ ...ok, consent: false }).consent).toBeDefined());
  it('mirrors the API limits', () => {
    expect(validateLead({ ...ok, name: 'x'.repeat(101) }).name).toBeDefined();
    expect(validateLead({ ...ok, message: 'x'.repeat(2001) }).message).toBeDefined();
    expect(validateLead({ ...ok, phone: 'call me' }).phone).toBeDefined();
    expect(validateLead({ ...ok, phone: '+49 (170) 123-456' }).phone).toBeUndefined();
  });
});

describe('readUtm', () => {
  it('reads and caps campaign parameters, ignoring blanks', () => {
    expect(readUtm('?utm_source=news&utm_medium=%20&utm_campaign=' + 'x'.repeat(150))).toEqual({
      utmSource: 'news',
      utmMedium: undefined,
      utmCampaign: 'x'.repeat(100),
    });
  });
});
