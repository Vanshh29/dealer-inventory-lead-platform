import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AuthUser, User } from '@dealer/shared';
import { lead } from '@/test/fixtures';
import { LeadAssignment, LeadStatusActions } from './lead-actions';

describe('LeadStatusActions', () => {
  it('offers exactly the transitions the API allows', () => {
    render(
      <LeadStatusActions
        lead={lead({ status: 'CONTACTED', allowedTransitions: ['TEST_DRIVE', 'OFFER', 'LOST'] })}
        canEdit
        busy={false}
        onChange={jest.fn()}
      />,
    );
    const buttons = screen.getAllByRole('button').map((b) => b.textContent);
    expect(buttons).toEqual(['Mark as Test drive', 'Mark as Offer', 'Mark as Lost']);
    expect(screen.queryByRole('button', { name: /Won/ })).not.toBeInTheDocument(); // not reachable from here
  });

  it('calls onChange with the target status', async () => {
    const onChange = jest.fn();
    render(<LeadStatusActions lead={lead()} canEdit busy={false} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Mark as Contacted' }));
    expect(onChange).toHaveBeenCalledWith('CONTACTED');
  });

  it('asks for confirmation before a final status and respects "cancel"', async () => {
    const onChange = jest.fn();
    const confirm = jest
      .spyOn(window, 'confirm')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    render(<LeadStatusActions lead={lead()} canEdit busy={false} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Mark as Lost' }));
    expect(onChange).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Mark as Lost' }));
    expect(onChange).toHaveBeenCalledWith('LOST');
    expect(confirm).toHaveBeenCalledTimes(2);
    confirm.mockRestore();
  });

  it('shows no buttons to read-only users', () => {
    render(<LeadStatusActions lead={lead()} canEdit={false} busy={false} onChange={jest.fn()} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText(/read-only access/)).toBeInTheDocument();
  });

  it('explains that closed leads cannot change', () => {
    render(
      <LeadStatusActions
        lead={lead({ status: 'WON', allowedTransitions: [] })}
        canEdit
        busy={false}
        onChange={jest.fn()}
      />,
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText(/closed \(Won\)/)).toBeInTheDocument();
  });

  it('disables actions while a change is in flight', () => {
    render(<LeadStatusActions lead={lead()} canEdit busy onChange={jest.fn()} />);
    for (const b of screen.getAllByRole('button')) expect(b).toBeDisabled();
  });
});

describe('LeadAssignment', () => {
  const me: AuthUser = { id: 'me', email: 'sales@dealer.test', role: 'SALES' };
  const users: User[] = [
    { id: 'me', email: 'sales@dealer.test', role: 'SALES', createdAt: '' },
    { id: 'boss', email: 'admin@dealer.test', role: 'ADMIN', createdAt: '' },
  ];

  it('lets SALES assign to themselves or unassign', async () => {
    const onAssign = jest.fn();
    const { rerender } = render(
      <LeadAssignment lead={lead()} me={me} canEdit busy={false} onAssign={onAssign} />,
    );
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Assign to me' }));
    expect(onAssign).toHaveBeenCalledWith('me');

    rerender(
      <LeadAssignment
        lead={lead({ assignedTo: { id: 'me', email: me.email, role: 'SALES' } })}
        me={me}
        canEdit
        busy={false}
        onAssign={onAssign}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Assign to me' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Unassign' }));
    expect(onAssign).toHaveBeenCalledWith(null);
  });

  it('gives ADMINs a picker with all assignable users', async () => {
    const onAssign = jest.fn();
    render(
      <LeadAssignment
        lead={lead()}
        me={{ ...me, role: 'ADMIN' }}
        assignees={users}
        canEdit
        busy={false}
        onAssign={onAssign}
      />,
    );
    await userEvent.selectOptions(screen.getByLabelText('Assigned to'), 'boss');
    expect(onAssign).toHaveBeenCalledWith('boss');
    await userEvent.selectOptions(screen.getByLabelText('Assigned to'), '');
    expect(onAssign).toHaveBeenLastCalledWith(null);
  });

  it('is read-only for viewers', () => {
    render(
      <LeadAssignment
        lead={lead({ assignedTo: { id: 'x', email: 'x@dealer.test', role: 'SALES' } })}
        me={{ ...me, role: 'VIEWER' }}
        canEdit={false}
        busy={false}
        onAssign={jest.fn()}
      />,
    );
    expect(screen.getByText('x@dealer.test')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
