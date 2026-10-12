import { INestApplication } from '@nestjs/common';
import { LeadStatus, Role } from '@prisma/client';
import { LEAD_STATUSES, canTransition } from '@dealer/shared';
import request from 'supertest';
import { PrismaService } from '../src/common/prisma.service';
import { createApp, createLead, createVehicle, loginAs, resetDb, seedUser } from './helpers';

const ROLES: Role[] = ['ADMIN', 'SALES', 'VIEWER'];

describe('Back-office leads', () => {
  let app: INestApplication;
  let vehicleId: string;
  const prisma = () => app.get(PrismaService);
  const auditFor = (leadId: string) =>
    prisma().auditLog.findMany({
      where: { entity: 'Lead', entityId: leadId },
      orderBy: { createdAt: 'asc' },
    });

  beforeAll(async () => (app = await createApp()));
  afterAll(async () => app.close());
  beforeEach(async () => {
    await resetDb(app);
    for (const r of ROLES) await seedUser(app, r);
    vehicleId = (await createVehicle(app)).id;
  });

  describe('permissions', () => {
    it('anonymous gets 401 everywhere', async () => {
      const lead = await createLead(app, vehicleId);
      const s = () => request(app.getHttpServer());
      await s().get('/admin/leads').expect(401);
      await s().get(`/admin/leads/${lead.id}`).expect(401);
      await s().patch(`/admin/leads/${lead.id}/status`).send({ status: 'CONTACTED' }).expect(401);
      await s().post(`/admin/leads/${lead.id}/notes`).send({ text: 'x' }).expect(401);
      await s().get('/admin/audit-logs').expect(401);
    });

    it.each(ROLES)('%s can read leads and notes', async (role) => {
      const lead = await createLead(app, vehicleId);
      const agent = await loginAs(app, role);
      await agent.get('/admin/leads').expect(200);
      await agent.get(`/admin/leads/${lead.id}`).expect(200);
      await agent.get(`/admin/leads/${lead.id}/notes`).expect(200);
    });

    it('VIEWER is read-only: 403 on status, assignment and notes, and nothing changes', async () => {
      const lead = await createLead(app, vehicleId);
      const viewer = await loginAs(app, 'VIEWER');
      await viewer
        .patch(`/admin/leads/${lead.id}/status`)
        .send({ status: 'CONTACTED' })
        .expect(403);
      await viewer
        .patch(`/admin/leads/${lead.id}/assignment`)
        .send({ assignedToId: null })
        .expect(403);
      await viewer.post(`/admin/leads/${lead.id}/notes`).send({ text: 'hello' }).expect(403);
      expect(await prisma().lead.findUniqueOrThrow({ where: { id: lead.id } })).toMatchObject({
        status: 'NEW',
      });
      expect(await prisma().leadNote.count()).toBe(0);
      expect(await auditFor(lead.id)).toHaveLength(0);
    });

    it.each(['SALES', 'ADMIN'] as Role[])(
      '%s can change status, assign and add notes',
      async (role) => {
        const lead = await createLead(app, vehicleId);
        const agent = await loginAs(app, role);
        await agent
          .patch(`/admin/leads/${lead.id}/status`)
          .send({ status: 'CONTACTED' })
          .expect(200);
        await agent
          .post(`/admin/leads/${lead.id}/notes`)
          .send({ text: 'Called, wants Saturday' })
          .expect(201);
      },
    );

    it('the audit log is ADMIN-only', async () => {
      await (await loginAs(app, 'ADMIN')).get('/admin/audit-logs').expect(200);
      await (await loginAs(app, 'SALES')).get('/admin/audit-logs').expect(403);
      await (await loginAs(app, 'VIEWER')).get('/admin/audit-logs').expect(403);
    });
  });

  describe('status transitions: every (from, to) pair', () => {
    const pairs = LEAD_STATUSES.flatMap((from) => LEAD_STATUSES.map((to) => [from, to] as const));

    it.each(pairs)('%s -> %s', async (from, to) => {
      const lead = await createLead(app, vehicleId, from);
      const sales = await loginAs(app, 'SALES');
      const res = await sales.patch(`/admin/leads/${lead.id}/status`).send({ status: to });

      if (canTransition(from, to)) {
        expect(res.status).toBe(200);
        expect(res.body.status).toBe(to);
        const [entry] = await auditFor(lead.id);
        expect(entry).toMatchObject({
          action: 'LEAD_STATUS_CHANGED',
          metadata: { status: { from, to } },
        });
      } else {
        expect(res.status).toBe(409);
        expect(res.body.message).toMatch(/status/i);
        const after = await prisma().lead.findUniqueOrThrow({ where: { id: lead.id } });
        expect(after.status).toBe(from); // unchanged
        expect(await auditFor(lead.id)).toHaveLength(0); // and not audited
      }
    });
  });

  describe('first response time', () => {
    it('is stamped when the lead first leaves NEW and never moved afterwards', async () => {
      const lead = await createLead(app, vehicleId);
      const sales = await loginAs(app, 'SALES');
      expect(lead.firstRespondedAt).toBeNull();

      await sales.patch(`/admin/leads/${lead.id}/status`).send({ status: 'CONTACTED' }).expect(200);
      const first = (await prisma().lead.findUniqueOrThrow({ where: { id: lead.id } }))
        .firstRespondedAt;
      expect(first).toBeInstanceOf(Date);

      await sales.patch(`/admin/leads/${lead.id}/status`).send({ status: 'OFFER' }).expect(200);
      const later = await prisma().lead.findUniqueOrThrow({ where: { id: lead.id } });
      expect(later.firstRespondedAt).toEqual(first);
    });
  });

  describe('lead lifecycle', () => {
    it('goes NEW -> WON through the API with an audit entry per step, attributed to the actor', async () => {
      const lead = await createLead(app, vehicleId);
      const sales = await prisma().user.findUniqueOrThrow({ where: { email: 'sales@test.dev' } });
      const agent = await loginAs(app, 'SALES');

      for (const status of ['CONTACTED', 'TEST_DRIVE', 'OFFER', 'WON'] as LeadStatus[]) {
        const res = await agent
          .patch(`/admin/leads/${lead.id}/status`)
          .send({ status })
          .expect(200);
        expect(res.body.status).toBe(status);
      }
      const final = await agent.get(`/admin/leads/${lead.id}`).expect(200);
      expect(final.body.firstRespondedAt).toEqual(expect.any(String));
      expect(final.body).toMatchObject({ status: 'WON', allowedTransitions: [] });

      const entries = await auditFor(lead.id);
      expect(entries.map((e) => e.metadata)).toEqual([
        { status: { from: 'NEW', to: 'CONTACTED' } },
        { status: { from: 'CONTACTED', to: 'TEST_DRIVE' } },
        { status: { from: 'TEST_DRIVE', to: 'OFFER' } },
        { status: { from: 'OFFER', to: 'WON' } },
      ]);
      expect(entries.every((e) => e.actorId === sales.id)).toBe(true);

      // and a finished lead is frozen
      const again = await agent
        .patch(`/admin/leads/${lead.id}/status`)
        .send({ status: 'LOST' })
        .expect(409);
      expect(again.body.message).toMatch(/no further status changes/);
    });

    it('goes NEW -> LOST', async () => {
      const lead = await createLead(app, vehicleId);
      const agent = await loginAs(app, 'SALES');
      await agent.patch(`/admin/leads/${lead.id}/status`).send({ status: 'LOST' }).expect(200);
      expect((await agent.get(`/admin/leads/${lead.id}`)).body.status).toBe('LOST');
    });

    it('error message lists the allowed next statuses', async () => {
      const lead = await createLead(app, vehicleId);
      const res = await (
        await loginAs(app, 'SALES')
      )
        .patch(`/admin/leads/${lead.id}/status`)
        .send({ status: 'WON' })
        .expect(409);
      expect(res.body.message).toContain('Allowed: CONTACTED, LOST');
    });

    it('detail exposes allowedTransitions so the UI needs no copy of the rules', async () => {
      const lead = await createLead(app, vehicleId, 'CONTACTED');
      const res = await (await loginAs(app, 'VIEWER')).get(`/admin/leads/${lead.id}`).expect(200);
      expect(res.body.allowedTransitions).toEqual(['TEST_DRIVE', 'OFFER', 'LOST']);
    });

    it('exactly one of two concurrent terminal decisions (WON vs LOST) wins', async () => {
      const lead = await createLead(app, vehicleId, 'OFFER');
      const a = await loginAs(app, 'SALES');
      const b = await loginAs(app, 'ADMIN');
      const results = await Promise.all([
        a.patch(`/admin/leads/${lead.id}/status`).send({ status: 'WON' }),
        b.patch(`/admin/leads/${lead.id}/status`).send({ status: 'LOST' }),
      ]);
      expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
      expect(await auditFor(lead.id)).toHaveLength(1);
    });

    it('validates input: unknown status 400, unknown lead 404, malformed id 400', async () => {
      const lead = await createLead(app, vehicleId);
      const agent = await loginAs(app, 'SALES');
      await agent.patch(`/admin/leads/${lead.id}/status`).send({ status: 'DONE' }).expect(400);
      await agent.patch(`/admin/leads/${lead.id}/status`).send({}).expect(400);
      await agent
        .patch('/admin/leads/00000000-0000-4000-8000-000000000000/status')
        .send({ status: 'LOST' })
        .expect(404);
      await agent.patch('/admin/leads/abc/status').send({ status: 'LOST' }).expect(400);
    });
  });

  describe('assignment', () => {
    it('assigns to a SALES user, audits it, and unassigns with null', async () => {
      const lead = await createLead(app, vehicleId);
      const sales = await prisma().user.findUniqueOrThrow({ where: { email: 'sales@test.dev' } });
      const admin = await loginAs(app, 'ADMIN');

      const res = await admin
        .patch(`/admin/leads/${lead.id}/assignment`)
        .send({ assignedToId: sales.id })
        .expect(200);
      expect(res.body.assignedTo).toMatchObject({ id: sales.id, email: 'sales@test.dev' });
      await admin
        .patch(`/admin/leads/${lead.id}/assignment`)
        .send({ assignedToId: null })
        .expect(200);

      const entries = await auditFor(lead.id);
      expect(entries.map((e) => [e.action, e.metadata])).toEqual([
        ['LEAD_ASSIGNED', { assignedTo: { from: null, to: sales.id } }],
        ['LEAD_ASSIGNED', { assignedTo: { from: sales.id, to: null } }],
      ]);
    });

    it('rejects VIEWER, unknown users and malformed ids as assignees', async () => {
      const lead = await createLead(app, vehicleId);
      const viewer = await prisma().user.findUniqueOrThrow({ where: { email: 'viewer@test.dev' } });
      const admin = await loginAs(app, 'ADMIN');
      await admin
        .patch(`/admin/leads/${lead.id}/assignment`)
        .send({ assignedToId: viewer.id })
        .expect(400);
      await admin
        .patch(`/admin/leads/${lead.id}/assignment`)
        .send({ assignedToId: '00000000-0000-4000-8000-000000000000' })
        .expect(400);
      await admin
        .patch(`/admin/leads/${lead.id}/assignment`)
        .send({ assignedToId: 'abc' })
        .expect(400);
      await admin.patch(`/admin/leads/${lead.id}/assignment`).send({}).expect(400);
    });

    it('re-assigning to the same user is a no-op without an audit entry', async () => {
      const sales = await prisma().user.findUniqueOrThrow({ where: { email: 'sales@test.dev' } });
      const lead = await createLead(app, vehicleId, 'NEW', { assignedToId: sales.id });
      const admin = await loginAs(app, 'ADMIN');
      await admin
        .patch(`/admin/leads/${lead.id}/assignment`)
        .send({ assignedToId: sales.id })
        .expect(200);
      expect(await auditFor(lead.id)).toHaveLength(0);
    });
  });

  describe('notes', () => {
    it('adds notes with the author from the session, lists them oldest first, counts them', async () => {
      const lead = await createLead(app, vehicleId);
      const sales = await loginAs(app, 'SALES');
      const admin = await loginAs(app, 'ADMIN');
      const n1 = await sales
        .post(`/admin/leads/${lead.id}/notes`)
        .send({ text: '  First call  ' })
        .expect(201);
      await admin.post(`/admin/leads/${lead.id}/notes`).send({ text: 'Second' }).expect(201);
      expect(n1.body).toMatchObject({ text: 'First call', author: { email: 'sales@test.dev' } });

      const list = await admin.get(`/admin/leads/${lead.id}/notes`).expect(200);
      expect(list.body.items.map((n: { text: string }) => n.text)).toEqual([
        'First call',
        'Second',
      ]);
      expect((await admin.get(`/admin/leads/${lead.id}`)).body.noteCount).toBe(2);
    });

    it('does not copy note text into the audit trail', async () => {
      const lead = await createLead(app, vehicleId);
      await (
        await loginAs(app, 'SALES')
      )
        .post(`/admin/leads/${lead.id}/notes`)
        .send({ text: 'secret customer detail' })
        .expect(201);
      const entries = await auditFor(lead.id);
      expect(entries).toHaveLength(1);
      expect(JSON.stringify(entries[0])).not.toContain('secret customer detail');
    });

    it('rejects empty and over-long notes; 404 for unknown lead; paginates', async () => {
      const lead = await createLead(app, vehicleId);
      const sales = await loginAs(app, 'SALES');
      await sales.post(`/admin/leads/${lead.id}/notes`).send({ text: '   ' }).expect(400);
      await sales
        .post(`/admin/leads/${lead.id}/notes`)
        .send({ text: 'x'.repeat(2001) })
        .expect(400);
      await sales
        .post('/admin/leads/00000000-0000-4000-8000-000000000000/notes')
        .send({ text: 'x' })
        .expect(404);
      await sales.get('/admin/leads/00000000-0000-4000-8000-000000000000/notes').expect(404);
      for (let i = 0; i < 3; i++)
        await sales
          .post(`/admin/leads/${lead.id}/notes`)
          .send({ text: `n${i}` })
          .expect(201);
      const page = await sales.get(`/admin/leads/${lead.id}/notes?limit=2&page=2`).expect(200);
      expect(page.body).toMatchObject({ total: 3, page: 2, limit: 2 });
      expect(page.body.items).toHaveLength(1);
      await sales.get(`/admin/leads/${lead.id}/notes?limit=101`).expect(400);
    });
  });

  describe('listing', () => {
    it('filters by status, assignee, vehicle and name/email, newest first, paginated', async () => {
      const sales = await prisma().user.findUniqueOrThrow({ where: { email: 'sales@test.dev' } });
      const other = (await createVehicle(app)).id;
      await createLead(app, vehicleId, 'NEW', {
        name: 'Anna Schmidt',
        email: 'anna@mail.de',
        createdAt: new Date('2026-01-01'),
      });
      await createLead(app, vehicleId, 'CONTACTED', {
        name: 'Ben Weber',
        email: 'ben@mail.de',
        assignedToId: sales.id,
        createdAt: new Date('2026-01-02'),
      });
      await createLead(app, other, 'NEW', {
        name: 'Cem Yilmaz',
        email: 'cem@web.de',
        createdAt: new Date('2026-01-03'),
      });
      const agent = await loginAs(app, 'VIEWER');
      const names = (r: request.Response) => r.body.items.map((l: { name: string }) => l.name);

      expect(names(await agent.get('/admin/leads'))).toEqual([
        'Cem Yilmaz',
        'Ben Weber',
        'Anna Schmidt',
      ]);
      expect(names(await agent.get('/admin/leads?status=NEW'))).toEqual([
        'Cem Yilmaz',
        'Anna Schmidt',
      ]);
      expect(names(await agent.get(`/admin/leads?assignedToId=${sales.id}`))).toEqual([
        'Ben Weber',
      ]);
      expect(names(await agent.get(`/admin/leads?vehicleId=${other}`))).toEqual(['Cem Yilmaz']);
      expect(names(await agent.get('/admin/leads?q=SCHMIDT'))).toEqual(['Anna Schmidt']);
      expect(names(await agent.get('/admin/leads?q=mail.de'))).toEqual([
        'Ben Weber',
        'Anna Schmidt',
      ]);

      const p = await agent.get('/admin/leads?limit=2&page=2').expect(200);
      expect(p.body).toMatchObject({ total: 3, page: 2 });
      expect(names(p)).toEqual(['Anna Schmidt']);
      await agent.get('/admin/leads?limit=101').expect(400);
      await agent.get('/admin/leads?status=DONE').expect(400);
    });

    it('includes a vehicle summary, and leads survive deletion of their vehicle', async () => {
      const lead = await createLead(app, vehicleId);
      const admin = await loginAs(app, 'ADMIN');
      const before = await admin.get(`/admin/leads/${lead.id}`).expect(200);
      expect(before.body.vehicle).toMatchObject({
        id: vehicleId,
        make: 'Volkswagen',
        model: 'Golf',
      });

      await admin.delete(`/admin/vehicles/${vehicleId}`).expect(204);
      const after = await admin.get(`/admin/leads/${lead.id}`).expect(200);
      expect(after.body).toMatchObject({ id: lead.id, vehicle: null });
    });
  });
});
