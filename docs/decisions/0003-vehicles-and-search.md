# 0003 – Vehicles, image storage and search

**Status:** accepted

## Routes

- Public (no login): `GET /vehicles` (catalog + search), `GET /vehicles/:id`. Only `PUBLISHED` vehicles are visible; everything else is a 404/absent. RESERVED/SOLD are deliberately hidden from the catalog (can be revisited as "show as sold" later).
- Back office: `/admin/vehicles` (+ `/:id`, `/:id/images`). Read = any logged-in role; write = ADMIN only (guards, not UI). A separate path keeps the public and private contracts independent (different filters, statuses visible, caching rules).

## Search

- **PostgreSQL full-text search, `simple` config.** Make/model names are not natural language and listings mix German and English, so stemming/stop-words would hurt more than help. Prefix matching (`golf` → `gol:*`) gives search-as-you-type behaviour.
- **Weighted generated column** `searchVector` (A make/model, B variant, C colour/fuel/gearbox, D description), `STORED` + GIN index. Kept in sync by PostgreSQL itself: no triggers, no application code, can't drift. Ranking uses `ts_rank`, so "golf" ranks a Golf above a BMW whose description mentions golf clubs (covered by a test).
- **Safe query building:** user text is reduced to letters/digits, each token becomes a prefix term, terms are ANDed, capped at 8 terms × 40 chars. Operators of `to_tsquery` cannot be injected, and values are bound parameters (`Prisma.sql`). `ORDER BY` fragments come from a fixed whitelist.
- **One raw SQL path.** Without `q`, plain Prisma queries. With `q`, a parameterised statement returns the page's ids (+ `count(*) OVER()` for the total), then rows load through Prisma and are re-ordered to the SQL ranking. Trade-off: filters are expressed twice (Prisma `where` and SQL fragments). Tests run the same filters through both paths.
- **Exact-match make/model filters** (case-sensitive) so the `(status, make, model)` index applies; the UI will offer values from the data. Free text is handled by `q`.
- **Migrations:** Prisma cannot model generated columns, so `searchVector` is declared `Unsupported("tsvector")?` and its definition lives in SQL migrations. Consequence: `prisma migrate dev` reports a harmless "default changed" diff for that column. Create future migrations with `--create-only` and delete the generated `ALTER COLUMN "searchVector"` statement. `migrate deploy` (CI, Docker) is unaffected. Fuel/gearbox became searchable in a second migration via an `IMMUTABLE` enum-label helper (enum→text casts are only `STABLE`, which generated columns reject); applied migrations are never edited.

## Images

- `StorageService` interface (`save`, `delete`) with a local-disk implementation behind a DI token; swapping in MinIO/S3 means one new class. Files are served at `/uploads/*`.
- Server-generated file names (UUID + extension from detected type). Type is detected from **magic bytes**, never the client's Content-Type: only JPEG/PNG/WebP. 5 MB limit (413), max 10 images per vehicle, orphan cleanup on DB failure and on delete.
- Helmet's `Cross-Origin-Resource-Policy` is relaxed to `cross-origin` so the web app (another origin) can render images; Swagger UI gets a relaxed CSP only under `/api/docs`.

## Data integrity

- Money: `priceCents` integer; floats rejected by validation. CHECK constraints (`>= 0` price/mileage, sane year) as a second line of defence behind DTO validation.
- VIN validated (17 chars, no I/O/Q) and normalised to upper case; unique index; duplicate → 409.

## Seed data

Deterministic generator (`prisma/seed-data.ts`, fixed PRNG seed): 240 vehicles by default (`SEED_VEHICLES=n` to scale), realistic make/model/variant catalogue, depreciation-based prices, mileage by age, ~70 % published. IDs derive from the VIN, so re-seeding is idempotent. Images are external placeholder URLs (no binary assets in git).
