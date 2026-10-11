'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { AuditLogEntry, Lead, LeadNote, LeadStatus, User } from '@dealer/shared';
import { api, describeError } from '@/lib/api';
import { formatDateTime, LEAD_STATUS_LABEL, vehicleTitle } from '@/lib/format';
import { canWorkLeads, useUser } from '@/lib/session';
import { useRemote } from '@/lib/use-remote';
import { LeadStatusBadge } from './badges';
import { LeadAssignment, LeadStatusActions } from './lead-actions';
import { Button, ErrorState, inputClass, Spinner } from './ui';

const NOTES_PAGE = 20;

function Notes({ leadId, canAdd }: { leadId: string; canAdd: boolean }) {
  const [items, setItems] = useState<LeadNote[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(
    async (page: number) => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.admin.leads.notes(leadId, { page, limit: NOTES_PAGE });
        setItems((prev) => (page === 1 ? res.items : [...prev, ...res.items]));
        setTotal(res.total);
      } catch (e) {
        setError(describeError(e));
      } finally {
        setLoading(false);
      }
    },
    [leadId],
  );
  useEffect(() => {
    void load(1);
  }, [load]);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const note = await api.admin.leads.addNote(leadId, text.trim());
      setText('');
      setTotal((t) => t + 1);
      setItems((prev) => (prev.length === total ? [...prev, note] : prev));
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="notes-h" className="glass rounded-2xl p-4">
      <h2 id="notes-h" className="text-lg font-semibold">
        Notes ({total})
      </h2>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-800">
          {error}
        </p>
      )}
      {loading && items.length === 0 && <Spinner />}
      {!loading && items.length === 0 && !error && (
        <p className="mt-2 text-sm text-slate-700">No notes yet.</p>
      )}
      <ul className="mt-3 space-y-3">
        {items.map((n) => (
          <li key={n.id} className="rounded-md bg-slate-50 p-3 text-sm">
            <p className="whitespace-pre-line text-slate-900">{n.text}</p>
            <p className="mt-1 text-xs text-slate-600">
              {n.author.email} · {formatDateTime(n.createdAt)}
            </p>
          </li>
        ))}
      </ul>
      {items.length < total && (
        <Button
          variant="secondary"
          className="mt-3"
          disabled={loading}
          onClick={() => void load(Math.floor(items.length / NOTES_PAGE) + 1)}
        >
          Show more
        </Button>
      )}
      {canAdd && (
        <form onSubmit={add} className="mt-4 space-y-2">
          <label htmlFor="new-note" className="block text-sm font-medium text-slate-800">
            Add a note
          </label>
          <textarea
            id="new-note"
            rows={3}
            maxLength={2000}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className={inputClass}
          />
          <Button type="submit" disabled={saving || !text.trim()}>
            {saving ? 'Saving…' : 'Add note'}
          </Button>
        </form>
      )}
    </section>
  );
}

function describeAudit(e: AuditLogEntry, who: (id: string | null) => string): string {
  const m = (e.metadata ?? {}) as Record<string, { from?: string | null; to?: string | null }>;
  switch (e.action) {
    case 'LEAD_CREATED':
      return 'Lead received from the website';
    case 'LEAD_STATUS_CHANGED':
      return `Status ${LEAD_STATUS_LABEL[m.status?.from as LeadStatus] ?? m.status?.from} → ${LEAD_STATUS_LABEL[m.status?.to as LeadStatus] ?? m.status?.to} by ${who(e.actorId)}`;
    case 'LEAD_ASSIGNED':
      return m.assignedTo?.to
        ? `Assigned to ${who(m.assignedTo.to)} by ${who(e.actorId)}`
        : `Unassigned by ${who(e.actorId)}`;
    case 'LEAD_NOTE_ADDED':
      return `Note added by ${who(e.actorId)}`;
    default:
      return e.action;
  }
}

function History({ leadId, users, version }: { leadId: string; users: User[]; version: number }) {
  const history = useRemote(
    () => api.admin.auditLogs({ entity: 'Lead', entityId: leadId, limit: 50 }),
    [leadId, version],
  );
  const who = (id: string | null) =>
    id ? (users.find((u) => u.id === id)?.email ?? 'a user') : 'the system';
  return (
    <section aria-labelledby="hist-h" className="glass rounded-2xl p-4">
      <h2 id="hist-h" className="text-lg font-semibold">
        History
      </h2>
      {history.loading && !history.data && <Spinner />}
      {history.error !== undefined && !history.loading && (
        <ErrorState message={describeError(history.error)} onRetry={history.reload} />
      )}
      <ol className="mt-3 space-y-2 text-sm">
        {history.data?.items.map((e) => (
          <li key={e.id}>
            <span className="text-slate-600">{formatDateTime(e.createdAt)}</span> —{' '}
            {describeAudit(e, who)}
          </li>
        ))}
      </ol>
    </section>
  );
}

export function LeadDetail({ id }: { id: string }) {
  const me = useUser();
  const canEdit = canWorkLeads(me.role);
  const isAdmin = me.role === 'ADMIN';
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const lead = useRemote(() => api.admin.leads.get(id), [id, version]);
  // Only ADMINs may list users (GET /users is admin-only); used for the assignee picker and history names.
  const users = useRemote<User[]>(
    async () => (isAdmin ? (await api.admin.users.list({ limit: 100 })).items : []),
    [isAdmin],
  );

  async function run(action: () => Promise<Lead>) {
    setBusy(true);
    setActionError(null);
    try {
      await action();
    } catch (e) {
      setActionError(describeError(e));
    } finally {
      setBusy(false);
      setVersion((v) => v + 1); // reload lead + history, also after a conflict (someone else changed it)
    }
  }

  if (lead.loading && !lead.data) return <Spinner />;
  if (lead.error !== undefined && !lead.data) {
    return <ErrorState message={describeError(lead.error)} onRetry={lead.reload} />;
  }
  const l = lead.data!;

  return (
    <div className="space-y-6">
      <Link href="/admin/leads" className="text-sm text-blue-800 hover:underline">
        ← All leads
      </Link>

      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{l.name}</h1>
        <LeadStatusBadge status={l.status} />
      </header>

      {actionError && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900"
        >
          {actionError}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <section aria-labelledby="enq-h" className="glass rounded-2xl p-4">
            <h2 id="enq-h" className="text-lg font-semibold">
              Enquiry
            </h2>
            <dl className="mt-3 grid grid-cols-[8rem_1fr] gap-y-2 text-sm">
              <dt className="text-slate-600">Email</dt>
              <dd>
                <a className="text-blue-800 hover:underline" href={`mailto:${l.email}`}>
                  {l.email}
                </a>
              </dd>
              <dt className="text-slate-600">Phone</dt>
              <dd>
                {l.phone ? (
                  <a
                    className="text-blue-800 hover:underline"
                    href={`tel:${l.phone.replace(/[^+\d]/g, '')}`}
                  >
                    {l.phone}
                  </a>
                ) : (
                  '—'
                )}
              </dd>
              <dt className="text-slate-600">Vehicle</dt>
              <dd>
                {l.vehicle ? (
                  <Link
                    className="text-blue-800 hover:underline"
                    href={`/admin/vehicles/${l.vehicle.id}`}
                  >
                    {vehicleTitle(l.vehicle)} ({l.vehicle.year})
                  </Link>
                ) : (
                  'Vehicle removed'
                )}
              </dd>
              <dt className="text-slate-600">Received</dt>
              <dd>{formatDateTime(l.createdAt)}</dd>
            </dl>
            <h3 className="mt-4 text-sm font-medium text-slate-700">Message</h3>
            <p className="mt-1 whitespace-pre-line rounded-md bg-slate-50 p-3 text-sm">
              {l.message}
            </p>
          </section>

          <Notes leadId={id} canAdd={canEdit} />
        </div>

        <div className="space-y-6">
          <section aria-labelledby="st-h" className="glass rounded-2xl p-4">
            <h2 id="st-h" className="mb-3 text-lg font-semibold">
              Status
            </h2>
            <LeadStatusActions
              lead={l}
              canEdit={canEdit}
              busy={busy}
              onChange={(s) => void run(() => api.admin.leads.changeStatus(id, s))}
            />
          </section>

          <section aria-labelledby="as-h" className="glass rounded-2xl p-4 text-sm">
            <h2 id="as-h" className="mb-3 text-lg font-semibold">
              Assigned to
            </h2>
            <LeadAssignment
              lead={l}
              me={me}
              canEdit={canEdit}
              busy={busy}
              assignees={isAdmin ? users.data?.filter((u) => u.role !== 'VIEWER') : undefined}
              onAssign={(uid) => void run(() => api.admin.leads.assign(id, uid))}
            />
          </section>

          {isAdmin && <History leadId={id} users={users.data ?? []} version={version} />}
        </div>
      </div>
    </div>
  );
}
