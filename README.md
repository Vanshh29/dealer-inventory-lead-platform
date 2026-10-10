# Dealer Inventory & Lead Platform

Full-stack used-car dealer platform: public catalog, lead capture, and an admin back office.
TypeScript end to end — Next.js, NestJS, PostgreSQL, Prisma (from Phase 1), Docker, GitHub Actions.

> Status: **Phase 4 (frontend) complete**.

## Quick start (Docker)

```bash
cp .env.example .env
docker compose up --build
```

- Web: http://localhost:3000
- API health: http://localhost:4000/health
- API docs (Swagger UI): http://localhost:4000/api/docs
- GraphQL (read-only catalog, `POST`): http://localhost:4000/graphql, see `docs/architecture.md` for an example
- Staff back office: http://localhost:3000/admin (demo logins below)

The API applies migrations on start. Seed demo data: three users (admin/sales/viewer `@dealer.test`, password `Passw0rd!Passw0rd!`, local use only) 240 vehicles (`SEED_VEHICLES=n`) and 40 demo leads (`SEED_LEADS=n`). Safe to run repeatedly:

```bash
docker compose exec api ./node_modules/.bin/tsx prisma/seed.ts
```

## Local development

Requires Node 22 and pnpm 9 (`corepack enable`).

```bash
pnpm install
pnpm --filter @dealer/shared build
docker compose up -d db
export DATABASE_URL='postgresql://dealer:dealer_dev_password@localhost:5432/dealer?schema=public'
export JWT_ACCESS_SECRET='dev-only-change-me-dev-only-change-me'
pnpm --filter @dealer/api db:migrate && pnpm --filter @dealer/api db:seed
pnpm --filter @dealer/api start:dev   # API on :4000
pnpm --filter @dealer/web dev         # Web on :3000
```

## Checks

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm test:int   # integration tests; needs Postgres on localhost:5432 with a `dealer_test` database
```

Create the test database once: `docker compose exec db psql -U dealer -d dealer -c 'CREATE DATABASE dealer_test'`.

## Try the API

```bash
curl 'http://localhost:4000/vehicles?q=golf&fuel=DIESEL&sort=price_asc&limit=5'
curl -c jar -H 'content-type: application/json' -d '{"email":"admin@dealer.test","password":"Passw0rd!Passw0rd!"}' http://localhost:4000/auth/login
curl -b jar http://localhost:4000/admin/vehicles?status=DRAFT
# submit a lead (public), then work it as sales
curl -H 'content-type: application/json' -d '{"vehicleId":"<id of a published vehicle>","name":"Erika","email":"e@example.com","message":"Still available?"}' http://localhost:4000/leads
curl -b jar 'http://localhost:4000/admin/leads?status=NEW'
curl -b jar -X PATCH -H 'content-type: application/json' -d '{"status":"CONTACTED"}' http://localhost:4000/admin/leads/<lead id>/status
```

Search performance numbers (measured, with caveats): `docs/architecture.md`.

## Using the site

- **Public:** `/` search and latest cars · `/vehicles` catalog with filters, sorting and pagination (state is in the URL) · `/vehicles/<id>` photos, specs and the enquiry form.
- **Back office** (`/admin`, log in with `admin@dealer.test`, `sales@dealer.test` or `viewer@dealer.test`, password `Passw0rd!Passw0rd!`): dashboard with pipeline counts · **Leads** table (filter by status, search, open a lead to change status, assign, add notes; admins also see its history) · **Vehicles** (create, edit, photos, delete: admin only).
- Roles: ADMIN everything · SALES works leads and notes, reads vehicles · VIEWER read-only. The server enforces this; the UI only hides what you cannot do.

## Browser tests (Playwright)

They drive the real stack in Chromium and fail on any console error or unexpected HTTP error.

```bash
cp -n .env.example .env
# the tests sign in many times a minute and want uncached data:
printf 'AUTH_RATE_LIMIT=100\nLEAD_RATE_LIMIT=100\nCATALOG_REVALIDATE_SECONDS=0\n' >> .env
docker compose up --build -d
docker compose exec api ./node_modules/.bin/tsx prisma/seed.ts
pnpm exec playwright install chromium      # once
pnpm test:e2e
```

## Layout

`apps/web` · `apps/api` · `packages/shared` · `docs/` (architecture, decision records)
