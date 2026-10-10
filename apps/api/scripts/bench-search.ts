/**
 * Measures catalog query latency against whatever data is in DATABASE_URL.
 *   DATABASE_URL=... pnpm --filter @dealer/api exec tsx scripts/bench-search.ts
 * Reports warm-cache latency of CatalogService.search() (SQL + hydration) and the planner's
 * own execution time for the raw full-text statement via EXPLAIN ANALYZE.
 */
import 'reflect-metadata';
import { Prisma } from '@prisma/client';
import { CatalogQuery } from '../src/search/catalog-query.dto';
import { CatalogService } from '../src/search/catalog.service';
import { PrismaService } from '../src/common/prisma.service';
import { toTsQuery } from '../src/search/ts-query';

const prisma = new PrismaService();
const catalog = new CatalogService(prisma);

const q = (o: Partial<CatalogQuery>): CatalogQuery => Object.assign(new CatalogQuery(), o);

const scenarios: [string, CatalogQuery][] = [
  [
    'filters only (make+fuel, price asc)',
    q({ make: 'Volkswagen', fuel: 'DIESEL', sort: 'price_asc' }),
  ],
  ['text: "golf"', q({ q: 'golf' })],
  ['text: "volkswagen diesel" (2 terms)', q({ q: 'volkswagen diesel' })],
  ['text prefix: "merc"', q({ q: 'merc' })],
  [
    'text "tdi" + filters + price sort',
    q({ q: 'tdi', priceMax: 2_000_000, yearMin: 2018, sort: 'price_asc' }),
  ],
];

const pct = (xs: number[], p: number): number =>
  xs[Math.min(xs.length - 1, Math.floor(xs.length * p))];

async function main(): Promise<void> {
  await prisma.$connect();
  const total = await prisma.vehicle.count();
  const published = await prisma.vehicle.count({ where: { status: 'PUBLISHED' } });
  console.log(`\nVehicles in DB: ${total} (published: ${published})\n`);
  console.log('| Scenario | median ms | p95 ms | hits |\n|---|---|---|---|');

  for (const [name, query] of scenarios) {
    for (let i = 0; i < 10; i++) await catalog.search(query); // warm-up
    const times: number[] = [];
    let hits = 0;
    for (let i = 0; i < 200; i++) {
      const t0 = process.hrtime.bigint();
      hits = (await catalog.search(query)).total;
      times.push(Number(process.hrtime.bigint() - t0) / 1e6);
    }
    times.sort((a, b) => a - b);
    console.log(
      `| ${name} | ${pct(times, 0.5).toFixed(2)} | ${pct(times, 0.95).toFixed(2)} | ${hits} |`,
    );
  }

  const tsq = toTsQuery('volkswagen diesel')!;
  const plan = await prisma.$queryRaw<{ 'QUERY PLAN': string }[]>(Prisma.sql`
    EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF)
    SELECT "id" FROM "Vehicle"
    WHERE "status" = 'PUBLISHED'::"VehicleStatus" AND "searchVector" @@ to_tsquery('simple', ${tsq})
    ORDER BY ts_rank("searchVector", to_tsquery('simple', ${tsq})) DESC LIMIT 20`);
  console.log('\nEXPLAIN ANALYZE (full-text statement):');
  for (const row of plan) console.log('  ' + row['QUERY PLAN']);
  await prisma.$disconnect();
}

void main();
