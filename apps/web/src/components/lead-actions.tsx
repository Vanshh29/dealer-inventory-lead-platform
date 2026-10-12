'use client';

import type { AuthUser, Lead, LeadStatus, User } from '@dealer/shared';
import { LEAD_STATUS_LABEL } from '@/lib/format';
import { Button, inputClass } from './ui';

const FINAL: LeadStatus[] = ['WON', 'LOST'];

/**
 * Offers exactly the transitions the API says are allowed (lead.allowedTransitions), so the rules
 * live in one place. VIEWERs get an explanation instead of buttons.
 */
export function LeadStatusActions({
  lead,
  canEdit,
  busy,
  onChange,
}: {
  lead: Lead;
  canEdit: boolean;
  busy: boolean;
  onChange: (status: LeadStatus) => void;
}) {
  if (!canEdit) {
    return (
      <p className="text-sm text-slate-700">
        You have read-only access and cannot change this lead.
      </p>
    );
  }
  if (lead.allowedTransitions.length === 0) {
    return (
      <p className="text-sm text-slate-700">
        This lead is closed ({LEAD_STATUS_LABEL[lead.status]}). No further changes are possible.
      </p>
    );
  }
  // The first non-terminal-loss step is the natural next action; losing a lead stays quiet.
  const primary = lead.allowedTransitions.find((t) => t !== 'LOST');
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Change status">
      {lead.allowedTransitions.map((to) => (
        <Button
          key={to}
          variant={to === 'LOST' ? 'danger-outline' : to === primary ? 'primary' : 'secondary'}
          disabled={busy}
          onClick={() => {
            if (
              FINAL.includes(to) &&
              !window.confirm(`Mark this lead as ${LEAD_STATUS_LABEL[to]}? This is final.`)
            )
              return;
            onChange(to);
          }}
        >
          Mark as {LEAD_STATUS_LABEL[to]}
        </Button>
      ))}
    </div>
  );
}

export function LeadAssignment({
  lead,
  me,
  assignees,
  canEdit,
  busy,
  onAssign,
}: {
  lead: Lead;
  me: AuthUser;
  /** Only ADMINs can list users; for SALES this is undefined and they can assign to themselves. */
  assignees?: User[];
  canEdit: boolean;
  busy: boolean;
  onAssign: (userId: string | null) => void;
}) {
  const current = lead.assignedTo;
  if (!canEdit) return <p>{current ? current.email : 'Unassigned'}</p>;

  if (assignees) {
    return (
      <div>
        <label htmlFor="assignee" className="sr-only">
          Assigned to
        </label>
        <select
          id="assignee"
          className={inputClass}
          disabled={busy}
          value={current?.id ?? ''}
          onChange={(e) => onAssign(e.target.value || null)}
        >
          <option value="">Unassigned</option>
          {assignees.map((u) => (
            <option key={u.id} value={u.id}>{`${u.email} (${u.role})`}</option>
          ))}
        </select>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span>{current ? current.email : 'Unassigned'}</span>
      {current?.id !== me.id && (
        <Button variant="secondary" disabled={busy} onClick={() => onAssign(me.id)}>
          Assign to me
        </Button>
      )}
      {current && (
        <Button variant="ghost" disabled={busy} onClick={() => onAssign(null)}>
          Unassign
        </Button>
      )}
    </div>
  );
}
