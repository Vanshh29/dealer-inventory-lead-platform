import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { LeadStatus, Prisma } from '@prisma/client';
import { allowedTransitions, canTransition } from '@dealer/shared';
import { AuditService } from '../audit/audit.service';
import { Page } from '../common/pagination';
import { PrismaService } from '../common/prisma.service';
import { CreateLeadDto, LeadListQuery } from './dto';

const leadSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  message: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  vehicle: { select: { id: true, make: true, model: true, variant: true, year: true } },
  assignedTo: { select: { id: true, email: true, role: true } },
  _count: { select: { notes: true } },
} satisfies Prisma.LeadSelect;

type LeadRow = Prisma.LeadGetPayload<{ select: typeof leadSelect }>;
export type LeadView = Omit<LeadRow, '_count'> & {
  noteCount: number;
  /** Valid next statuses, so clients never have to duplicate the rules. */
  allowedTransitions: readonly LeadStatus[];
};

const toView = ({ _count, ...lead }: LeadRow): LeadView => ({
  ...lead,
  noteCount: _count.notes,
  allowedTransitions: allowedTransitions(lead.status),
});

const noteSelect = {
  id: true,
  leadId: true,
  text: true,
  createdAt: true,
  author: { select: { id: true, email: true } },
} satisfies Prisma.LeadNoteSelect;

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Public submission. Always resolves for honeypot hits so bots cannot tell they were dropped. */
  async submit(dto: CreateLeadDto): Promise<void> {
    if (dto.website) {
      this.logger.warn('Honeypot triggered; lead dropped'); // deliberately no personal data in logs
      return;
    }
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, status: 'PUBLISHED' },
      select: { id: true },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    await this.prisma.$transaction(async (tx) => {
      const lead = await tx.lead.create({
        data: {
          vehicleId: dto.vehicleId,
          name: dto.name,
          email: dto.email.toLowerCase(),
          phone: dto.phone,
          message: dto.message,
        },
        select: { id: true },
      });
      await this.audit.record(
        {
          actorId: null,
          action: 'LEAD_CREATED',
          entity: 'Lead',
          entityId: lead.id,
          metadata: { vehicleId: dto.vehicleId },
        },
        tx,
      );
    });
  }

  async list(q: LeadListQuery): Promise<Page<LeadView>> {
    const where: Prisma.LeadWhereInput = {
      ...(q.status && { status: q.status }),
      ...(q.assignedToId && { assignedToId: q.assignedToId }),
      ...(q.vehicleId && { vehicleId: q.vehicleId }),
      ...(q.q && {
        OR: [
          { name: { contains: q.q, mode: 'insensitive' } },
          { email: { contains: q.q, mode: 'insensitive' } },
        ],
      }),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.lead.findMany({
        where,
        select: leadSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.lead.count({ where }),
    ]);
    return { items: rows.map(toView), page: q.page, limit: q.limit, total };
  }

  async get(id: string): Promise<LeadView> {
    const lead = await this.prisma.lead.findUnique({ where: { id }, select: leadSelect });
    if (!lead) throw new NotFoundException('Lead not found');
    return toView(lead);
  }

  async changeStatus(id: string, to: LeadStatus, actorId: string): Promise<LeadView> {
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.lead.findUnique({ where: { id }, select: { status: true } });
      if (!current) throw new NotFoundException('Lead not found');

      if (!canTransition(current.status, to)) {
        const next = allowedTransitions(current.status);
        throw new ConflictException(
          next.length === 0
            ? `Lead is ${current.status}; no further status changes are allowed`
            : `Cannot change status from ${current.status} to ${to}. Allowed: ${next.join(', ')}`,
        );
      }
      // Compare-and-set: only applies if nobody changed the status since we read it.
      const res = await tx.lead.updateMany({
        where: { id, status: current.status },
        data: { status: to },
      });
      if (res.count !== 1) {
        throw new ConflictException('Lead was changed by someone else; reload and try again');
      }
      await this.audit.record(
        {
          actorId,
          action: 'LEAD_STATUS_CHANGED',
          entity: 'Lead',
          entityId: id,
          metadata: { status: { from: current.status, to } },
        },
        tx,
      );
    });
    return this.get(id);
  }

  async assign(id: string, assignedToId: string | null, actorId: string): Promise<LeadView> {
    await this.prisma.$transaction(async (tx) => {
      const lead = await tx.lead.findUnique({ where: { id }, select: { assignedToId: true } });
      if (!lead) throw new NotFoundException('Lead not found');

      if (assignedToId) {
        const assignee = await tx.user.findUnique({
          where: { id: assignedToId },
          select: { role: true },
        });
        if (!assignee || assignee.role === 'VIEWER') {
          throw new BadRequestException('Assignee must be an existing SALES or ADMIN user');
        }
      }
      if (lead.assignedToId === assignedToId) return; // nothing to change, nothing to audit

      await tx.lead.update({ where: { id }, data: { assignedToId } });
      await this.audit.record(
        {
          actorId,
          action: 'LEAD_ASSIGNED',
          entity: 'Lead',
          entityId: id,
          metadata: { assignedTo: { from: lead.assignedToId, to: assignedToId } },
        },
        tx,
      );
    });
    return this.get(id);
  }

  async addNote(leadId: string, text: string, authorId: string) {
    await this.get(leadId); // 404 for unknown leads
    return this.prisma.$transaction(async (tx) => {
      const note = await tx.leadNote.create({
        data: { leadId, authorId, text },
        select: noteSelect,
      });
      // The note text itself is not copied into the audit trail.
      await this.audit.record(
        {
          actorId: authorId,
          action: 'LEAD_NOTE_ADDED',
          entity: 'Lead',
          entityId: leadId,
          metadata: { noteId: note.id },
        },
        tx,
      );
      return note;
    });
  }

  async listNotes(leadId: string, page: number, limit: number) {
    await this.get(leadId);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.leadNote.findMany({
        where: { leadId },
        select: noteSelect,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.leadNote.count({ where: { leadId } }),
    ]);
    return { items, page, limit, total };
  }
}
