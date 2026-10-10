import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Page } from '../common/pagination';
import { PrismaService } from '../common/prisma.service';
import { vehicleSelect, VehicleWithImages } from '../vehicles/vehicles.service';
import { CatalogQuery, CatalogSort } from './catalog-query.dto';
import { toTsQuery } from './ts-query';

const prismaOrder: Record<
  Exclude<CatalogSort, 'relevance'>,
  Prisma.VehicleOrderByWithRelationInput[]
> = {
  newest: [{ createdAt: 'desc' }, { id: 'asc' }],
  price_asc: [{ priceCents: 'asc' }, { id: 'asc' }],
  price_desc: [{ priceCents: 'desc' }, { id: 'asc' }],
  year_desc: [{ year: 'desc' }, { id: 'asc' }],
  mileage_asc: [{ mileage: 'asc' }, { id: 'asc' }],
};

// Fixed whitelist of SQL fragments; user input never reaches ORDER BY.
const sqlOrder = (tsq: string): Record<CatalogSort, Prisma.Sql> => ({
  relevance: Prisma.sql`ts_rank("searchVector", to_tsquery('simple', ${tsq})) DESC, "id" ASC`,
  newest: Prisma.sql`"createdAt" DESC, "id" ASC`,
  price_asc: Prisma.sql`"priceCents" ASC, "id" ASC`,
  price_desc: Prisma.sql`"priceCents" DESC, "id" ASC`,
  year_desc: Prisma.sql`"year" DESC, "id" ASC`,
  mileage_asc: Prisma.sql`"mileage" ASC, "id" ASC`,
});

/**
 * Public catalog. Only PUBLISHED vehicles are ever visible.
 * Without `q`: plain Prisma query. With `q`: the only raw SQL in the project (parameterised
 * full-text search), which returns the page of ids; rows are then loaded through Prisma.
 */
@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: CatalogQuery): Promise<Page<VehicleWithImages>> {
    if (
      query.priceMin !== undefined &&
      query.priceMax !== undefined &&
      query.priceMin > query.priceMax
    ) {
      throw new BadRequestException('priceMin must not exceed priceMax');
    }
    if (
      query.yearMin !== undefined &&
      query.yearMax !== undefined &&
      query.yearMin > query.yearMax
    ) {
      throw new BadRequestException('yearMin must not exceed yearMax');
    }
    const tsq = query.q ? toTsQuery(query.q) : null;
    return tsq ? this.fullText(query, tsq) : this.filtered(query);
  }

  async findPublished(id: string): Promise<VehicleWithImages> {
    const v = await this.prisma.vehicle.findFirst({
      where: { id, status: 'PUBLISHED' },
      select: vehicleSelect,
    });
    if (!v) throw new NotFoundException('Vehicle not found');
    return v;
  }

  private async filtered(q: CatalogQuery): Promise<Page<VehicleWithImages>> {
    const where: Prisma.VehicleWhereInput = {
      status: 'PUBLISHED',
      ...(q.make && { make: q.make }),
      ...(q.model && { model: q.model }),
      ...(q.fuel && { fuel: q.fuel }),
      ...(q.gearbox && { gearbox: q.gearbox }),
      ...((q.priceMin !== undefined || q.priceMax !== undefined) && {
        priceCents: { gte: q.priceMin, lte: q.priceMax },
      }),
      ...((q.yearMin !== undefined || q.yearMax !== undefined) && {
        year: { gte: q.yearMin, lte: q.yearMax },
      }),
      ...(q.mileageMax !== undefined && { mileage: { lte: q.mileageMax } }),
    };
    const sort = q.sort && q.sort !== 'relevance' ? q.sort : 'newest';
    const [items, total] = await this.prisma.$transaction([
      this.prisma.vehicle.findMany({
        where,
        select: vehicleSelect,
        orderBy: prismaOrder[sort],
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.vehicle.count({ where }),
    ]);
    return { items, page: q.page, limit: q.limit, total };
  }

  private async fullText(q: CatalogQuery, tsq: string): Promise<Page<VehicleWithImages>> {
    const conds: Prisma.Sql[] = [
      Prisma.sql`"status" = 'PUBLISHED'::"VehicleStatus"`,
      Prisma.sql`"searchVector" @@ to_tsquery('simple', ${tsq})`,
    ];
    if (q.make) conds.push(Prisma.sql`"make" = ${q.make}`);
    if (q.model) conds.push(Prisma.sql`"model" = ${q.model}`);
    if (q.fuel) conds.push(Prisma.sql`"fuel" = ${q.fuel}::"FuelType"`);
    if (q.gearbox) conds.push(Prisma.sql`"gearbox" = ${q.gearbox}::"Gearbox"`);
    if (q.priceMin !== undefined) conds.push(Prisma.sql`"priceCents" >= ${q.priceMin}`);
    if (q.priceMax !== undefined) conds.push(Prisma.sql`"priceCents" <= ${q.priceMax}`);
    if (q.yearMin !== undefined) conds.push(Prisma.sql`"year" >= ${q.yearMin}`);
    if (q.yearMax !== undefined) conds.push(Prisma.sql`"year" <= ${q.yearMax}`);
    if (q.mileageMax !== undefined) conds.push(Prisma.sql`"mileage" <= ${q.mileageMax}`);
    const where = Prisma.join(conds, ' AND ');
    const order = sqlOrder(tsq)[q.sort ?? 'relevance'];

    const rows = await this.prisma.$queryRaw<{ id: string; total: bigint }[]>`
      SELECT "id", count(*) OVER () AS total
      FROM "Vehicle"
      WHERE ${where}
      ORDER BY ${order}
      LIMIT ${q.limit} OFFSET ${(q.page - 1) * q.limit}`;

    let total = rows.length > 0 ? Number(rows[0].total) : 0;
    if (rows.length === 0 && q.page > 1) {
      const [{ count }] = await this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT count(*) AS count FROM "Vehicle" WHERE ${where}`;
      total = Number(count);
    }

    const ids = rows.map((r) => r.id);
    const loaded = await this.prisma.vehicle.findMany({
      where: { id: { in: ids } },
      select: vehicleSelect,
    });
    const byId = new Map(loaded.map((v) => [v.id, v]));
    const items = ids.flatMap((id) => byId.get(id) ?? []); // keep the SQL ranking order
    return { items, page: q.page, limit: q.limit, total };
  }
}
