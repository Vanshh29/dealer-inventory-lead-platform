import { Injectable } from '@nestjs/common';
import { AuditLog, Prisma } from '@prisma/client';
import { Page } from '../common/pagination';
import { PrismaService } from '../common/prisma.service';

export interface AuditEntry {
  /** null = the system itself (e.g. a public visitor submitting a lead). */
  actorId: string | null;
  action: string;
  entity: string;
  entityId: string;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Pass the transaction client so the audit row commits or rolls back together with the change
   * it describes: no change without a record, no record of a change that did not happen.
   */
  record(entry: AuditEntry, client: Prisma.TransactionClient = this.prisma): Promise<AuditLog> {
    return client.auditLog.create({ data: entry });
  }

  async list(
    filter: { entity?: string; entityId?: string; actorId?: string },
    page: number,
    limit: number,
  ): Promise<Page<AuditLog>> {
    const where: Prisma.AuditLogWhereInput = { ...filter };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items, page, limit, total };
  }
}
