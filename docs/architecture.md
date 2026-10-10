# Architecture

Work in progress — filled in as phases land. Planned: system diagram, data model, index rationale (Phase 2), auth flow (Phase 1).

| Layer  | Tech                                         |
| ------ | -------------------------------------------- |
| Web    | Next.js App Router, React, Tailwind          |
| API    | NestJS (REST first, GraphQL read-only later) |
| DB     | PostgreSQL 16 (+ Prisma from Phase 1)        |
| Shared | `@dealer/shared` types and constants         |

## Auth and RBAC (Phase 1)

```
Browser ──cookie: access_token (15m JWT)──▶ ThrottlerGuard ▶ JwtAuthGuard ▶ RolesGuard ▶ controller
        ──cookie: refresh_token (opaque, Path=/auth)──▶ POST /auth/refresh (rotates)
```

| Endpoint                                                           | Access                              |
| ------------------------------------------------------------------ | ----------------------------------- |
| `GET /health`, `POST /auth/login`, `/auth/refresh`, `/auth/logout` | public (login/refresh rate-limited) |
| `GET /auth/me`                                                     | any authenticated user              |
| `POST /users`, `GET /users`                                        | ADMIN                               |

Data model: `User(id, email unique, passwordHash, role, createdAt)`, `RefreshToken(id, userId, tokenHash unique, expiresAt, revokedAt)` with an index on `userId`. Rationale and trade-offs: `docs/decisions/0002-auth-and-rbac.md`.

## Vehicles and search (Phase 2)

| Endpoint                                                     | Access                 |
| ------------------------------------------------------------ | ---------------------- |
| `GET /vehicles`, `GET /vehicles/:id`                         | public, PUBLISHED only |
| `GET /admin/vehicles`, `GET /admin/vehicles/:id`             | any logged-in role     |
| `POST/PATCH/DELETE /admin/vehicles…`, `POST/DELETE …/images` | ADMIN                  |

Interactive docs: `/api/docs` (JSON: `/api/docs-json`). A test fails if a route is missing from the spec or lacks a summary.

Catalog query parameters: `q`, `make`, `model`, `priceMin`/`priceMax` (cents), `yearMin`/`yearMax`, `mileageMax`, `fuel`, `gearbox`, `sort` (`relevance` | `newest` | `price_asc` | `price_desc` | `year_desc` | `mileage_asc`), `page`, `limit` (1–100).

### Indexes (table `Vehicle`)

| Index                                | Why                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------- |
| `GIN (searchVector)`                 | full-text `@@` lookups; the only index type that serves tsvector matching |
| `(status, priceCents)`               | public catalog = `status = PUBLISHED` + price range / price sort          |
| `(status, year)`                     | year range and year sort                                                  |
| `(status, make, model)`              | make/model filters (equality) and the facet dropdowns                     |
| `(status, mileage)`                  | mileage ceiling and mileage sort                                          |
| `(status, createdAt)`                | default "newest" sort for catalog and back-office lists                   |
| `UNIQUE (vin)`                       | business key, duplicate detection                                         |
| `VehicleImage (vehicleId, position)` | gallery loading in order                                                  |

`status` leads every composite index because every public query filters on it. Indexes cost write time and disk, so only columns that are actually filtered or sorted have one (no index on colour or fuel alone: low selectivity, and fuel/gearbox are covered by the search vector).

### Measured search performance

Measured with `apps/api/scripts/bench-search.ts` (200 timed runs after 10 warm-up runs, warm cache; includes SQL **and** loading the page's rows with images through Prisma). PostgreSQL 16 in Docker on a developer laptop (macOS), API and DB on the same machine, so no network latency. Your numbers will differ.

| Scenario                              | 240 seeded vehicles (168 published): median / p95 | 20,000 vehicles (13,940 published): median / p95 |
| ------------------------------------- | ------------------------------------------------- | ------------------------------------------------ |
| filters only (make + fuel, price asc) | 1.17 / 1.30 ms                                    | 2.24 / 2.46 ms                                   |
| text `golf`                           | 0.87 / 0.93 ms                                    | 5.09 / 6.43 ms                                   |
| text `volkswagen diesel`              | 0.76 / 0.96 ms                                    | 5.73 / 6.84 ms                                   |
| prefix `merc`                         | 0.96 / 1.05 ms                                    | 5.61 / 6.87 ms                                   |
| text `tdi` + filters + price sort     | 0.58 / 0.61 ms                                    | 5.19 / 6.82 ms                                   |

Honest reading:

- On the seeded data (240 rows) every query is around or under 1 ms; PostgreSQL scans such a small table regardless of indexes.
- The 20,000-row run was done on a throw-away database to see behaviour at scale. There, `EXPLAIN ANALYZE` shows the planner choosing a **sequential scan (~4.7 ms)** for `volkswagen diesel`, because the synthetic data has only ~11 makes, so those terms match ~2–4 % of rows and the planner judges scanning cheaper. For a selective term, the GIN index **is** used (`Bitmap Index Scan on "Vehicle_searchVector_idx"`, ~2.4 ms for a text-only predicate with a rare term). Real inventories have a much wider vocabulary, so selective terms are the common case. This is a statement about this synthetic data, not a guarantee.
- Further headroom if needed: a partial GIN index `WHERE status = 'PUBLISHED'`, or ranking only the top-N matches.

## Leads and audit (Phase 3)

| Endpoint                                                                                            | Access                         |
| --------------------------------------------------------------------------------------------------- | ------------------------------ |
| `POST /leads`                                                                                       | public, rate-limited, honeypot |
| `GET /admin/leads`, `GET /admin/leads/:id`, `GET /admin/leads/:id/notes`                            | any logged-in role             |
| `PATCH /admin/leads/:id/status`, `PATCH /admin/leads/:id/assignment`, `POST /admin/leads/:id/notes` | SALES, ADMIN                   |
| `GET /admin/audit-logs`                                                                             | ADMIN                          |

Data model: `Lead(vehicleId?, name, email, phone?, message, status, assignedToId?)`, `LeadNote(leadId, authorId, text)`, `AuditLog(actorId?, action, entity, entityId, metadata)`.

```
NEW → CONTACTED → TEST_DRIVE → OFFER → WON     any open state → LOST     (WON/LOST terminal)
```

Rules, concurrency handling, audit design and GDPR notes: `docs/decisions/0004-leads-and-audit.md`.

### Indexes added in Phase 3

| Index                                    | Why                                              |
| ---------------------------------------- | ------------------------------------------------ |
| `Lead (status, createdAt)`               | lead list/board filtered by status, newest first |
| `Lead (assignedToId, status)`            | "my open leads"                                  |
| `Lead (vehicleId)`                       | leads per vehicle; FK lookups                    |
| `Lead (createdAt)`                       | unfiltered newest-first list                     |
| `LeadNote (leadId, createdAt)`           | notes of one lead in order                       |
| `AuditLog (entity, entityId, createdAt)` | history of one entity                            |
| `AuditLog (actorId, createdAt)`          | what did this user do                            |
| `AuditLog (createdAt)`                   | unfiltered newest-first list                     |
